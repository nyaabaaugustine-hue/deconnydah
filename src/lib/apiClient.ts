import type {
  Vehicle,
  Driver,
  Supervisor,
  VehicleDocument,
  ServiceLog,
  BatteryLog,
  TyreLog,
  RevenueEntry,
  AccidentReport,
  VehiclePhoto,
  Valuation,
} from '@/types/fleet';

// ── Snake ↔ Camel conversion ──────────────────────────────────────────────────

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function convertKeys<T>(obj: Record<string, any>): T {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[toCamel(key)] = obj[key];
  }
  return result as T;
}

// Postgres NUMERIC/DECIMAL columns come back from node-postgres as STRINGS
// (to avoid floating-point precision loss) — not numbers. If code sums them with
// `+` before converting, JS silently does string concatenation instead of
// arithmetic (e.g. "0" + "3200.00" + "450.00" => "03200.00450.00"). This helper
// coerces the known money/quantity fields to real numbers right after fetch, so
// every consumer downstream always works with actual numbers.
function coerceNumberFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
  for (const field of fields) {
    if (obj[field] !== null && obj[field] !== undefined) {
      (obj as any)[field] = Number(obj[field]);
    }
  }
  return obj;
}

// ── Base fetch helpers ────────────────────────────────────────────────────────

const API_BASE = '/api';

// ── Simple GET cache (5s TTL) ────────────────────────────────────────────────
// Eliminates redundant fetches when React re-renders or multiple components
// mount simultaneously (e.g. FleetDashboard + sidebar stats).
const getCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5_000;

function cachedGet<T>(path: string): Promise<T> {
  const now = Date.now();
  const cached = getCache.get(path);
  if (cached && now < cached.expiresAt) return Promise.resolve(cached.data as T);

  return get<T>(path).then((data) => {
    getCache.set(path, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  });
}

/** Prefetch a GET endpoint in the background so the data is cached by the
 *  time the user navigates to the view.  Fire-and-forget — errors are logged
 *  but never thrown. */
export function prefetch(path: string): void {
  if (getCache.has(path)) return;
  get<unknown>(path)
    .then((data) => getCache.set(path, { data, expiresAt: Date.now() + CACHE_TTL_MS }))
    .catch(() => {});
}

/** Invalidate cached GET responses (e.g. after a create/update/delete). */
export function invalidateCache(pathPrefix?: string) {
  if (!pathPrefix) { getCache.clear(); return; }
  for (const key of getCache.keys()) {
    if (key.startsWith(pathPrefix)) getCache.delete(key);
  }
}

// ── Auth token management ─────────────────────────────────────────────────────

const TOKEN_KEY = 'fleet_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // SSR or storage full — ignore
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getAuthToken();
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  // NOTE: no camelCase→snake_case conversion here. Every Express route
  // (server/routes/*.ts) reads req.body fields in camelCase directly (e.g.
  // `b.plateNumber`, `requireFields(['plateNumber', ...])`) and maps them to
  // snake_case SQL columns itself. Converting the outgoing body to snake_case
  // (as an earlier version of this function did) meant the server never found
  // the keys it was looking for: creates failed requireFields validation with a
  // 400, and updates matched zero columns and silently no-opped.
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function get<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PATCH', path, body);
}

function del(path: string): Promise<void> {
  return request<void>('DELETE', path);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'manager' | 'viewer';
  mustChangePassword?: boolean;
}

const BACKEND_UNREACHABLE_MESSAGE =
  "Can't reach the backend server. Make sure `npm run server` is running (in its own terminal, at the same time as `npm run dev`) before signing in.";

export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    // fetch() itself threw — network-level failure, e.g. backend not listening at all
    throw new Error(BACKEND_UNREACHABLE_MESSAGE);
  }

  if (!res.ok) {
    const raw = await res.text();
    let err: { error?: string };
    try {
      err = JSON.parse(raw);
    } catch {
      // A response DID come back (we have an HTTP status), it just wasn't JSON.
      // On Vite dev this can mean the proxy's own error page (backend not running
      // locally) — but on a real deployment it usually means the serverless
      // function itself crashed (e.g. missing env var) and the platform returned
      // its own HTML/text error page. Showing the "run npm run server" message
      // here would be actively misleading in production, so only show that
      // hint in dev; otherwise report it as a server-side failure.
      if (import.meta.env.DEV) {
        throw new Error(BACKEND_UNREACHABLE_MESSAGE);
      }
      throw new Error(`Server error (${res.status}). The backend may have failed to start — check deployment logs.`);
    }
    throw new Error(err.error || `Login failed: ${res.status}`);
  }
  const data = await res.json();
  setAuthToken(data.token);
  return data;
}

export async function getMe(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setAuthToken(null);
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await post('/auth/logout', {});
  } finally {
    setAuthToken(null);
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await post('/auth/change-password', { currentPassword, newPassword });
}

// ── Vehicles ──────────────────────────────────────────────────────────────────

export function getVehicles(): Promise<Vehicle[]> {
  return get<Vehicle[]>('/vehicles').then((rows) => rows.map((r) => coerceNumberFields(convertKeys<Vehicle>(r), ['purchasePrice', 'year'])));
}

export function getVehicle(id: string): Promise<Vehicle | null> {
  return get<Vehicle>(`/vehicles/${id}`).then((r) => (r ? coerceNumberFields(convertKeys<Vehicle>(r), ['purchasePrice', 'year']) : null)).catch(() => null);
}

export function createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
  return post<Vehicle>('/vehicles', data).then((r) => coerceNumberFields(convertKeys<Vehicle>(r), ['purchasePrice', 'year']));
}

export function updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
  return patch<Vehicle>(`/vehicles/${id}`, data).then((r) => coerceNumberFields(convertKeys<Vehicle>(r), ['purchasePrice', 'year']));
}

export function deleteVehicle(id: string): Promise<void> {
  return del(`/vehicles/${id}`);
}

// ── Drivers ───────────────────────────────────────────────────────────────────

export function getDrivers(): Promise<Driver[]> {
  return get<Driver[]>('/drivers').then((rows) => rows.map((r) => convertKeys<Driver>(r)));
}

export function getDriver(id: string): Promise<Driver | null> {
  return get<Driver>(`/drivers/${id}`).then((r) => (r ? convertKeys<Driver>(r) : null)).catch(() => null);
}

export function createDriver(data: Partial<Driver>): Promise<Driver> {
  return post<Driver>('/drivers', data).then((r) => convertKeys<Driver>(r));
}

export function updateDriver(id: string, data: Partial<Driver>): Promise<Driver> {
  return patch<Driver>(`/drivers/${id}`, data).then((r) => convertKeys<Driver>(r));
}

export function deleteDriver(id: string): Promise<void> {
  return del(`/drivers/${id}`);
}

export interface DriverProfile {
  driver: Driver;
  supervisor: { id: string; fullName: string; phone: string; region: string } | null;
  assignedVehicle: { id: string; plateNumber: string; make: string; model: string; year: number; status: string } | null;
  inspections: { id: string; vehicleId: string; inspectionDate: string; overallStatus: string; notes: string; photoCount: number }[];
  revenue: {
    total: number;
    trips: number;
    entries: { id: string; vehicleId: string; tripDate: string; tripReference: string; route: string; client: string; amount: number }[];
  };
  accidents: { id: string; vehicleId: string; accidentDate: string; description: string; cost: number; driverAtFault: boolean }[];
}

export function getDriverProfile(id: string): Promise<DriverProfile | null> {
  return get<DriverProfile>(`/drivers/${id}/profile`).catch(() => null);
}

// ── Supervisors ───────────────────────────────────────────────────────────────

export function getSupervisors(): Promise<Supervisor[]> {
  return get<Supervisor[]>('/supervisors').then((rows) => rows.map((r) => convertKeys<Supervisor>(r)));
}

// ── Documents (per vehicle) ───────────────────────────────────────────────────

export function getDocumentsForVehicle(vehicleId: string): Promise<VehicleDocument[]> {
  return get<VehicleDocument[]>(`/documents/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => convertKeys<VehicleDocument>(r)),
  );
}

export function createDocument(data: Partial<VehicleDocument>): Promise<VehicleDocument> {
  return post<VehicleDocument>('/documents', data).then((r) => convertKeys<VehicleDocument>(r));
}

export function updateDocument(id: string, data: Partial<VehicleDocument>): Promise<VehicleDocument> {
  return patch<VehicleDocument>(`/documents/${id}`, data).then((r) => convertKeys<VehicleDocument>(r));
}

export function deleteDocument(id: string): Promise<void> {
  return del(`/documents/${id}`);
}

// ── Service logs (per vehicle) ────────────────────────────────────────────────

export function getServiceLogsForVehicle(vehicleId: string): Promise<ServiceLog[]> {
  return get<ServiceLog[]>(`/services/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => coerceNumberFields(convertKeys<ServiceLog>(r), ['cost', 'mileageKm'])),
  );
}

export function createServiceLog(data: Partial<ServiceLog>): Promise<ServiceLog> {
  return post<ServiceLog>('/services', data).then((r) => coerceNumberFields(convertKeys<ServiceLog>(r), ['cost', 'mileageKm']));
}

export function updateServiceLog(id: string, data: Partial<ServiceLog>): Promise<ServiceLog> {
  return patch<ServiceLog>(`/services/${id}`, data).then((r) => coerceNumberFields(convertKeys<ServiceLog>(r), ['cost', 'mileageKm']));
}

export function deleteServiceLog(id: string): Promise<void> {
  return del(`/services/${id}`);
}

// ── Battery logs (per vehicle) ────────────────────────────────────────────────

export function getBatteryLogsForVehicle(vehicleId: string): Promise<BatteryLog[]> {
  return get<BatteryLog[]>(`/battery/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => coerceNumberFields(convertKeys<BatteryLog>(r), ['cost'])),
  );
}

export function createBatteryLog(data: Partial<BatteryLog>): Promise<BatteryLog> {
  return post<BatteryLog>('/battery', data).then((r) => coerceNumberFields(convertKeys<BatteryLog>(r), ['cost']));
}

export function updateBatteryLog(id: string, data: Partial<BatteryLog>): Promise<BatteryLog> {
  return patch<BatteryLog>(`/battery/${id}`, data).then((r) => coerceNumberFields(convertKeys<BatteryLog>(r), ['cost']));
}

export function deleteBatteryLog(id: string): Promise<void> {
  return del(`/battery/${id}`);
}

// ── Tyre logs (per vehicle) ───────────────────────────────────────────────────

export function getTyreLogsForVehicle(vehicleId: string): Promise<TyreLog[]> {
  return get<TyreLog[]>(`/tyres/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => coerceNumberFields(convertKeys<TyreLog>(r), ['cost'])),
  );
}

export function createTyreLog(data: Partial<TyreLog>): Promise<TyreLog> {
  return post<TyreLog>('/tyres', data).then((r) => coerceNumberFields(convertKeys<TyreLog>(r), ['cost']));
}

export function updateTyreLog(id: string, data: Partial<TyreLog>): Promise<TyreLog> {
  return patch<TyreLog>(`/tyres/${id}`, data).then((r) => coerceNumberFields(convertKeys<TyreLog>(r), ['cost']));
}

export function deleteTyreLog(id: string): Promise<void> {
  return del(`/tyres/${id}`);
}

// ── Revenue entries (per vehicle) ─────────────────────────────────────────────

export function getRevenueForVehicle(vehicleId: string): Promise<RevenueEntry[]> {
  return get<RevenueEntry[]>(`/revenue/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => coerceNumberFields(convertKeys<RevenueEntry>(r), ['amount'])),
  );
}

export function createRevenueEntry(data: Partial<RevenueEntry>): Promise<RevenueEntry> {
  return post<RevenueEntry>('/revenue', data).then((r) => coerceNumberFields(convertKeys<RevenueEntry>(r), ['amount']));
}

export function updateRevenueEntry(id: string, data: Partial<RevenueEntry>): Promise<RevenueEntry> {
  return patch<RevenueEntry>(`/revenue/${id}`, data).then((r) => coerceNumberFields(convertKeys<RevenueEntry>(r), ['amount']));
}

export function deleteRevenueEntry(id: string): Promise<void> {
  return del(`/revenue/${id}`);
}

// ── Accident reports (per vehicle) ────────────────────────────────────────────

export function getAccidentsForVehicle(vehicleId: string): Promise<AccidentReport[]> {
  return get<AccidentReport[]>(`/accidents/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => coerceNumberFields(convertKeys<AccidentReport>(r), ['cost'])),
  );
}

export function createAccidentReport(data: Partial<AccidentReport>): Promise<AccidentReport> {
  return post<AccidentReport>('/accidents', data).then((r) => coerceNumberFields(convertKeys<AccidentReport>(r), ['cost']));
}

export function updateAccidentReport(id: string, data: Partial<AccidentReport>): Promise<AccidentReport> {
  return patch<AccidentReport>(`/accidents/${id}`, data).then((r) => coerceNumberFields(convertKeys<AccidentReport>(r), ['cost']));
}

export function deleteAccidentReport(id: string): Promise<void> {
  return del(`/accidents/${id}`);
}

// ── Vehicle photos (per vehicle) ──────────────────────────────────────────────

export function getPhotosForVehicle(vehicleId: string): Promise<VehiclePhoto[]> {
  return get<VehiclePhoto[]>(`/photos/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => convertKeys<VehiclePhoto>(r)),
  );
}

export function createVehiclePhoto(data: Partial<VehiclePhoto>): Promise<VehiclePhoto> {
  return post<VehiclePhoto>('/photos', data).then((r) => convertKeys<VehiclePhoto>(r));
}

export function updateVehiclePhoto(id: string, data: Partial<VehiclePhoto>): Promise<VehiclePhoto> {
  return patch<VehiclePhoto>(`/photos/${id}`, data).then((r) => convertKeys<VehiclePhoto>(r));
}

export function deleteVehiclePhoto(id: string): Promise<void> {
  return del(`/photos/${id}`);
}

// ── MinIO document upload ──────────────────────────────────────────────────
// Two-step presigned upload: (1) server gives back a presigned PUT URL,
// (2) browser PUTs the file directly to MinIO.  The file never touches our
// server process — only the URL signature is generated server-side.

interface PresignedUpload {
  uploadUrl: string;
  objectKey: string;
  bucket: string;
  publicUrl?: string;
}

export async function uploadFileToMinIO(file: File): Promise<{ objectKey: string; bucket: string; fileName: string }> {
  const sig = await post<PresignedUpload>('/uploads/presign', {
    kind: 'document',
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });

  const res = await fetch(sig.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`File upload failed: ${res.statusText}`);
  }

  return { objectKey: sig.objectKey, bucket: sig.bucket, fileName: file.name };
}

export async function uploadPhotoToMinIO(file: File): Promise<{ objectKey: string; bucket: string; publicUrl: string }> {
  const sig = await post<PresignedUpload>('/uploads/presign', {
    kind: 'photo',
    fileName: file.name,
    contentType: file.type || 'image/jpeg',
    sizeBytes: file.size,
  });

  const res = await fetch(sig.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Photo upload failed: ${res.statusText}`);
  }

  return { objectKey: sig.objectKey, bucket: sig.bucket, publicUrl: sig.publicUrl || '' };
}

// ── Cloudinary image upload ───────────────────────────────────────────────────
// Two-step signed upload: (1) ask our server for a signature (the Cloudinary API
// secret never leaves the server), (2) POST the file bytes straight to Cloudinary
// from the browser using that signature. See server/routes/uploads.ts.

interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

export async function uploadImageToCloudinary(file: File, folder = 'vehicle-photos'): Promise<string> {
  const sig = await post<CloudinarySignature>('/uploads/cloudinary-signature', { folder });

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);

  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || 'Image upload to Cloudinary failed');
  }
  const data = await res.json();
  return data.secure_url as string;
}

// ── Valuations (per vehicle) ──────────────────────────────────────────────────

export function getValuationsForVehicle(vehicleId: string): Promise<Valuation[]> {
  return get<Valuation[]>(`/valuations/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => coerceNumberFields(convertKeys<Valuation>(r), ['amount'])),
  );
}

export function createValuation(data: Partial<Valuation>): Promise<Valuation> {
  return post<Valuation>('/valuations', data).then((r) => coerceNumberFields(convertKeys<Valuation>(r), ['amount']));
}

export function updateValuation(id: string, data: Partial<Valuation>): Promise<Valuation> {
  return patch<Valuation>(`/valuations/${id}`, data).then((r) => coerceNumberFields(convertKeys<Valuation>(r), ['amount']));
}

export function deleteValuation(id: string): Promise<void> {
  return del(`/valuations/${id}`);
}

// ── Inspections (per vehicle) ─────────────────────────────────────────────────

export interface Inspection {
  id: string;
  vehicleId: string;
  driverName: string;
  inspectionDate: string;
  overallStatus: 'pass' | 'fail' | 'flagged';
  checklist: Array<{ key: string; label: string; status: 'pass' | 'fail' | 'flagged'; note?: string }>;
  notes: string;
  photoCount: number;
}

export function getInspections(): Promise<Inspection[]> {
  return get<any[]>('/inspections').then((rows) =>
    rows.map((r) => ({
      ...convertKeys<Inspection>(r),
      checklist: typeof r.checklist === 'string' ? JSON.parse(r.checklist) : r.checklist,
    })),
  );
}

export function getInspectionsForVehicle(vehicleId: string): Promise<Inspection[]> {
  return get<any[]>(`/inspections/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => ({
      ...convertKeys<Inspection>(r),
      checklist: typeof r.checklist === 'string' ? JSON.parse(r.checklist) : r.checklist,
    })),
  );
}

export function createInspection(data: {
  vehicleId: string;
  driverName: string;
  inspectionDate: string;
  overallStatus: string;
  checklist: Array<{ key: string; label: string; status: string; note?: string }>;
  notes?: string;
  photoCount?: number;
}): Promise<Inspection> {
  return post<any>('/inspections', data).then((r) => ({
    ...convertKeys<Inspection>(r),
    checklist: typeof r.checklist === 'string' ? JSON.parse(r.checklist) : r.checklist,
  }));
}

export function updateInspection(id: string, data: Partial<Inspection>): Promise<Inspection> {
  return patch<any>(`/inspections/${id}`, data).then((r) => ({
    ...convertKeys<Inspection>(r),
    checklist: typeof r.checklist === 'string' ? JSON.parse(r.checklist) : r.checklist,
  }));
}

export function deleteInspection(id: string): Promise<void> {
  return del(`/inspections/${id}`);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function daysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Health ────────────────────────────────────────────────────────────────────

export function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return get<{ status: string; timestamp: string }>('/health');
}

// ── User management (admin only) ──────────────────────────────────────────────

export interface ManagedUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'manager' | 'viewer';
  createdAt: string;
}

export function getUsers(): Promise<ManagedUser[]> {
  return get<ManagedUser[]>('/auth/users');
}

export function createUser(data: { username: string; password: string; displayName: string; role: string }): Promise<ManagedUser> {
  return post<ManagedUser>('/auth/users', data);
}

export function updateUserRole(id: string, data: { displayName?: string; role?: string }): Promise<void> {
  return patch<void>(`/auth/users/${id}`, data);
}

export function deleteUser(id: string): Promise<void> {
  return del(`/auth/users/${id}`);
}

export function resetUserPassword(id: string, newPassword: string): Promise<void> {
  return post<void>(`/auth/users/${id}/reset-password`, { newPassword });
}

// ── Role helpers ──────────────────────────────────────────────────────────────

export function canWrite(role: string): boolean {
  return role === 'admin' || role === 'manager';
}

export function canDelete(role: string): boolean {
  return role === 'admin';
}

// ── Assignments ─────────────────────────────────────────────────────────────

export interface VehicleAssignment {
  id: string;
  vehicleId: string;
  driverId: string;
  vehiclePlate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  driverName?: string;
  startDate: string;
  endDate?: string;
  purpose: string;
  status: 'active' | 'completed' | 'cancelled';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function getAssignments(): Promise<VehicleAssignment[]> {
  return get<any[]>('/assignments').then((rows) => rows.map((r) => coerceNumberFields(convertKeys<VehicleAssignment>(r), [])));
}

export function getActiveAssignments(): Promise<VehicleAssignment[]> {
  return get<any[]>('/assignments/active').then((rows) => rows.map((r) => coerceNumberFields(convertKeys<VehicleAssignment>(r), [])));
}

export function getAssignmentsForVehicle(vehicleId: string): Promise<VehicleAssignment[]> {
  return get<any[]>(`/assignments/vehicle/${vehicleId}`).then((rows) => rows.map((r) => coerceNumberFields(convertKeys<VehicleAssignment>(r), [])));
}

export function getAssignmentsForDriver(driverId: string): Promise<VehicleAssignment[]> {
  return get<any[]>(`/assignments/driver/${driverId}`).then((rows) => rows.map((r) => coerceNumberFields(convertKeys<VehicleAssignment>(r), [])));
}

export function createAssignment(data: Partial<VehicleAssignment>): Promise<VehicleAssignment> {
  return post<any>('/assignments', data).then((r) => coerceNumberFields(convertKeys<VehicleAssignment>(r), []));
}

export function updateAssignment(id: string, data: Partial<VehicleAssignment>): Promise<VehicleAssignment> {
  return patch<any>(`/assignments/${id}`, data).then((r) => coerceNumberFields(convertKeys<VehicleAssignment>(r), []));
}

export function deleteAssignment(id: string): Promise<void> {
  return del(`/assignments/${id}`);
}

// ── Work Orders ─────────────────────────────────────────────────────────────

export interface WorkOrder {
  id: string;
  vehicleId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo: string;
  estimatedCost: number;
  actualCost: number;
  dueDate?: string;
  completedDate?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export function getWorkOrders(): Promise<WorkOrder[]> {
  return get<any[]>('/work-orders').then((rows) => rows.map((r) => coerceNumberFields(convertKeys<WorkOrder>(r), ['estimatedCost', 'actualCost'])));
}

export function getWorkOrder(id: string): Promise<WorkOrder> {
  return get<any>(`/work-orders/${id}`).then((r) => coerceNumberFields(convertKeys<WorkOrder>(r), ['estimatedCost', 'actualCost']));
}

export function createWorkOrder(data: Partial<WorkOrder>): Promise<WorkOrder> {
  return post<any>('/work-orders', data).then((r) => coerceNumberFields(convertKeys<WorkOrder>(r), ['estimatedCost', 'actualCost']));
}

export function updateWorkOrder(id: string, data: Partial<WorkOrder>): Promise<WorkOrder> {
  return patch<any>(`/work-orders/${id}`, data).then((r) => coerceNumberFields(convertKeys<WorkOrder>(r), ['estimatedCost', 'actualCost']));
}

export function deleteWorkOrder(id: string): Promise<void> {
  return del(`/work-orders/${id}`);
}

// ── Fuel ────────────────────────────────────────────────────────────────────

export interface FuelEntry {
  id: string;
  vehicleId: string;
  driverId?: string;
  fuelDate: string;
  station: string;
  fuelType: string;
  liters: number;
  costPerLiter: number;
  totalCost: number;
  mileageKm?: number;
  fuelCard: string;
  receiptNumber: string;
  createdAt: string;
  updatedAt: string;
}

export function getFuelEntries(): Promise<FuelEntry[]> {
  return get<any[]>('/fuel').then((rows) => rows.map((r) => coerceNumberFields(convertKeys<FuelEntry>(r), ['liters', 'costPerLiter', 'totalCost'])));
}

export function getFuelEntriesForVehicle(vehicleId: string): Promise<FuelEntry[]> {
  return get<any[]>(`/fuel/vehicle/${vehicleId}`).then((rows) => rows.map((r) => coerceNumberFields(convertKeys<FuelEntry>(r), ['liters', 'costPerLiter', 'totalCost'])));
}

export function createFuelEntry(data: Partial<FuelEntry>): Promise<FuelEntry> {
  return post<any>('/fuel', data).then((r) => coerceNumberFields(convertKeys<FuelEntry>(r), ['liters', 'costPerLiter', 'totalCost']));
}

export function deleteFuelEntry(id: string): Promise<void> {
  return del(`/fuel/${id}`);
}

// ── Expenses ────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  vehicleId?: string;
  driverId?: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function getExpenses(): Promise<Expense[]> {
  return get<any[]>('/expenses').then((rows) => rows.map((r) => coerceNumberFields(convertKeys<Expense>(r), ['amount'])));
}

export function getExpensesForVehicle(vehicleId: string): Promise<Expense[]> {
  return get<any[]>(`/expenses/vehicle/${vehicleId}`).then((rows) => rows.map((r) => coerceNumberFields(convertKeys<Expense>(r), ['amount'])));
}

export function getExpensesByCategory(category: string): Promise<Expense[]> {
  return get<any[]>(`/expenses/category/${category}`).then((rows) => rows.map((r) => coerceNumberFields(convertKeys<Expense>(r), ['amount'])));
}

export function createExpense(data: Partial<Expense>): Promise<Expense> {
  return post<any>('/expenses', data).then((r) => coerceNumberFields(convertKeys<Expense>(r), ['amount']));
}

export function updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
  return patch<any>(`/expenses/${id}`, data).then((r) => coerceNumberFields(convertKeys<Expense>(r), ['amount']));
}

export function deleteExpense(id: string): Promise<void> {
  return del(`/expenses/${id}`);
}

// ── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  category: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export function getNotifications(): Promise<Notification[]> {
  return get<any[]>('/notifications').then((rows) => rows.map((r) => convertKeys<Notification>(r)));
}

export function getUnreadNotificationCount(): Promise<number> {
  return get<{ count: number }>('/notifications/unread-count').then((r) => r.count);
}

export function createNotification(data: Partial<Notification>): Promise<Notification> {
  return post<any>('/notifications', data).then((r) => convertKeys<Notification>(r));
}

export function markNotificationRead(id: string): Promise<void> {
  return patch(`/notifications/${id}/read`, {});
}

export function markAllNotificationsRead(): Promise<void> {
  return patch('/notifications/read-all', {});
}

export function deleteNotification(id: string): Promise<void> {
  return del(`/notifications/${id}`);
}

// ── Settings ────────────────────────────────────────────────────────────────

export interface CompanySetting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export function getSettings(): Promise<CompanySetting[]> {
  return get<any[]>('/settings').then((rows) => rows.map((r) => convertKeys<CompanySetting>(r)));
}

export function getSetting(key: string): Promise<CompanySetting> {
  return get<any>(`/settings/${key}`).then((r) => convertKeys<CompanySetting>(r));
}

export function updateSetting(key: string, data: { value: string }): Promise<CompanySetting> {
  return patch<any>(`/settings/${key}`, data).then((r) => convertKeys<CompanySetting>(r));
}

export function createSetting(data: Partial<CompanySetting>): Promise<CompanySetting> {
  return post<any>('/settings', data).then((r) => convertKeys<CompanySetting>(r));
}

// ── Spare Parts ─────────────────────────────────────────────────────────────

export interface SparePart {
  id: string;
  name: string;
  partNumber: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  supplier: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export function getSpareParts(): Promise<SparePart[]> {
  return get<any[]>('/spare-parts').then((rows) => rows.map((r) => coerceNumberFields(convertKeys<SparePart>(r), ['unitCost'])));
}

export function getLowStockParts(): Promise<SparePart[]> {
  return get<any[]>('/spare-parts/low-stock').then((rows) => rows.map((r) => coerceNumberFields(convertKeys<SparePart>(r), ['unitCost'])));
}

export function createSparePart(data: Partial<SparePart>): Promise<SparePart> {
  return post<any>('/spare-parts', data).then((r) => coerceNumberFields(convertKeys<SparePart>(r), ['unitCost']));
}

export function updateSparePart(id: string, data: Partial<SparePart>): Promise<SparePart> {
  return patch<any>(`/spare-parts/${id}`, data).then((r) => coerceNumberFields(convertKeys<SparePart>(r), ['unitCost']));
}

export function deleteSparePart(id: string): Promise<void> {
  return del(`/spare-parts/${id}`);
}

// ── Service Providers ───────────────────────────────────────────────────────

export interface ServiceProvider {
  id: string;
  name: string;
  type: string;
  phone: string;
  email: string;
  address: string;
  specialties: string;
  rating: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function getServiceProviders(): Promise<ServiceProvider[]> {
  return get<any[]>('/service-providers').then((rows) => rows.map((r) => coerceNumberFields(convertKeys<ServiceProvider>(r), ['rating'])));
}

export function createServiceProvider(data: Partial<ServiceProvider>): Promise<ServiceProvider> {
  return post<any>('/service-providers', data).then((r) => coerceNumberFields(convertKeys<ServiceProvider>(r), ['rating']));
}

export function updateServiceProvider(id: string, data: Partial<ServiceProvider>): Promise<ServiceProvider> {
  return patch<any>(`/service-providers/${id}`, data).then((r) => coerceNumberFields(convertKeys<ServiceProvider>(r), ['rating']));
}

export function deleteServiceProvider(id: string): Promise<void> {
  return del(`/service-providers/${id}`);
}

// ── Driver Licenses ─────────────────────────────────────────────────────────

export interface DriverLicense {
  id: string;
  driverId: string;
  driverName?: string;
  licenseClass: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function getDriverLicenses(): Promise<DriverLicense[]> {
  return get<any[]>('/driver-licenses').then((rows) => rows.map((r) => convertKeys<DriverLicense>(r)));
}

export function getDriverLicensesForDriver(driverId: string): Promise<DriverLicense[]> {
  return get<any[]>(`/driver-licenses/driver/${driverId}`).then((rows) => rows.map((r) => convertKeys<DriverLicense>(r)));
}

export function createDriverLicense(data: Partial<DriverLicense>): Promise<DriverLicense> {
  return post<any>('/driver-licenses', data).then((r) => convertKeys<DriverLicense>(r));
}

export function updateDriverLicense(id: string, data: Partial<DriverLicense>): Promise<DriverLicense> {
  return patch<any>(`/driver-licenses/${id}`, data).then((r) => convertKeys<DriverLicense>(r));
}

export function deleteDriverLicense(id: string): Promise<void> {
  return del(`/driver-licenses/${id}`);
}

// ── Driver Contracts ────────────────────────────────────────────────────────

export interface DriverContract {
  id: string;
  driverId: string;
  driverName?: string;
  contractType: string;
  startDate: string;
  endDate: string | null;
  education: string;
  qualifications: string;
  experienceYears: number;
  salary: number;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function getDriverContracts(): Promise<DriverContract[]> {
  return get<any[]>('/driver-contracts').then((rows) => rows.map((r) => coerceNumberFields(convertKeys<DriverContract>(r), ['experienceYears', 'salary'])));
}

export function getDriverContractsForDriver(driverId: string): Promise<DriverContract[]> {
  return get<any[]>(`/driver-contracts/driver/${driverId}`).then((rows) => rows.map((r) => coerceNumberFields(convertKeys<DriverContract>(r), ['experienceYears', 'salary'])));
}

export function createDriverContract(data: Partial<DriverContract>): Promise<DriverContract> {
  return post<any>('/driver-contracts', data).then((r) => coerceNumberFields(convertKeys<DriverContract>(r), ['experienceYears', 'salary']));
}

export function updateDriverContract(id: string, data: Partial<DriverContract>): Promise<DriverContract> {
  return patch<any>(`/driver-contracts/${id}`, data).then((r) => coerceNumberFields(convertKeys<DriverContract>(r), ['experienceYears', 'salary']));
}

export function deleteDriverContract(id: string): Promise<void> {
  return del(`/driver-contracts/${id}`);
}

// ── Driver Evaluations ──────────────────────────────────────────────────────

export interface DriverEvaluation {
  id: string;
  driverId: string;
  driverName?: string;
  evaluatorName: string;
  evaluationDate: string;
  period: string;
  safetyScore: number | null;
  punctualityScore: number | null;
  drivingSkillScore: number | null;
  overallScore: number | null;
  strengths: string;
  improvements: string;
  comments: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function getDriverEvaluations(): Promise<DriverEvaluation[]> {
  return get<any[]>('/driver-evaluations').then((rows) => rows.map((r) => convertKeys<DriverEvaluation>(r)));
}

export function getDriverEvaluationsForDriver(driverId: string): Promise<DriverEvaluation[]> {
  return get<any[]>(`/driver-evaluations/driver/${driverId}`).then((rows) => rows.map((r) => convertKeys<DriverEvaluation>(r)));
}

export function createDriverEvaluation(data: Partial<DriverEvaluation>): Promise<DriverEvaluation> {
  return post<any>('/driver-evaluations', data).then((r) => convertKeys<DriverEvaluation>(r));
}

export function updateDriverEvaluation(id: string, data: Partial<DriverEvaluation>): Promise<DriverEvaluation> {
  return patch<any>(`/driver-evaluations/${id}`, data).then((r) => convertKeys<DriverEvaluation>(r));
}

export function deleteDriverEvaluation(id: string): Promise<void> {
  return del(`/driver-evaluations/${id}`);
}
