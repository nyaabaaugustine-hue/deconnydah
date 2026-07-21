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
      // Non-JSON body (e.g. Vite's dev-proxy default error page) means the request
      // never actually reached our Express server, not that the server rejected it.
      throw new Error(BACKEND_UNREACHABLE_MESSAGE);
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

// ── Service logs (per vehicle) ────────────────────────────────────────────────

export function getServiceLogsForVehicle(vehicleId: string): Promise<ServiceLog[]> {
  return get<ServiceLog[]>(`/services/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => coerceNumberFields(convertKeys<ServiceLog>(r), ['cost', 'mileageKm'])),
  );
}

export function createServiceLog(data: Partial<ServiceLog>): Promise<ServiceLog> {
  return post<ServiceLog>('/services', data).then((r) => coerceNumberFields(convertKeys<ServiceLog>(r), ['cost', 'mileageKm']));
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

// ── Tyre logs (per vehicle) ───────────────────────────────────────────────────

export function getTyreLogsForVehicle(vehicleId: string): Promise<TyreLog[]> {
  return get<TyreLog[]>(`/tyres/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => coerceNumberFields(convertKeys<TyreLog>(r), ['cost'])),
  );
}

export function createTyreLog(data: Partial<TyreLog>): Promise<TyreLog> {
  return post<TyreLog>('/tyres', data).then((r) => coerceNumberFields(convertKeys<TyreLog>(r), ['cost']));
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

// ── Accident reports (per vehicle) ────────────────────────────────────────────

export function getAccidentsForVehicle(vehicleId: string): Promise<AccidentReport[]> {
  return get<AccidentReport[]>(`/accidents/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => coerceNumberFields(convertKeys<AccidentReport>(r), ['cost'])),
  );
}

export function createAccidentReport(data: Partial<AccidentReport>): Promise<AccidentReport> {
  return post<AccidentReport>('/accidents', data).then((r) => coerceNumberFields(convertKeys<AccidentReport>(r), ['cost']));
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
