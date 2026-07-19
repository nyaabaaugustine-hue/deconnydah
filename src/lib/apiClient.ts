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

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function convertKeys<T>(obj: Record<string, any>): T {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[toCamel(key)] = obj[key];
  }
  return result as T;
}

function convertKeysReverse(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[toSnake(key)] = obj[key];
  }
  return result;
}

// ── Base fetch helpers ────────────────────────────────────────────────────────

const API_BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(convertKeysReverse(body as Record<string, any>));
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

// ── Vehicles ──────────────────────────────────────────────────────────────────

export function getVehicles(): Promise<Vehicle[]> {
  return get<Vehicle[]>('/vehicles').then((rows) => rows.map((r) => convertKeys<Vehicle>(r)));
}

export function getVehicle(id: string): Promise<Vehicle | null> {
  return get<Vehicle>(`/vehicles/${id}`).then((r) => (r ? convertKeys<Vehicle>(r) : null)).catch(() => null);
}

export function createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
  return post<Vehicle>('/vehicles', data).then((r) => convertKeys<Vehicle>(r));
}

export function updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
  return patch<Vehicle>(`/vehicles/${id}`, data).then((r) => convertKeys<Vehicle>(r));
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
    rows.map((r) => convertKeys<ServiceLog>(r)),
  );
}

export function createServiceLog(data: Partial<ServiceLog>): Promise<ServiceLog> {
  return post<ServiceLog>('/services', data).then((r) => convertKeys<ServiceLog>(r));
}

// ── Battery logs (per vehicle) ────────────────────────────────────────────────

export function getBatteryLogsForVehicle(vehicleId: string): Promise<BatteryLog[]> {
  return get<BatteryLog[]>(`/battery/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => convertKeys<BatteryLog>(r)),
  );
}

export function createBatteryLog(data: Partial<BatteryLog>): Promise<BatteryLog> {
  return post<BatteryLog>('/battery', data).then((r) => convertKeys<BatteryLog>(r));
}

// ── Tyre logs (per vehicle) ───────────────────────────────────────────────────

export function getTyreLogsForVehicle(vehicleId: string): Promise<TyreLog[]> {
  return get<TyreLog[]>(`/tyres/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => convertKeys<TyreLog>(r)),
  );
}

export function createTyreLog(data: Partial<TyreLog>): Promise<TyreLog> {
  return post<TyreLog>('/tyres', data).then((r) => convertKeys<TyreLog>(r));
}

// ── Revenue entries (per vehicle) ─────────────────────────────────────────────

export function getRevenueForVehicle(vehicleId: string): Promise<RevenueEntry[]> {
  return get<RevenueEntry[]>(`/revenue/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => convertKeys<RevenueEntry>(r)),
  );
}

export function createRevenueEntry(data: Partial<RevenueEntry>): Promise<RevenueEntry> {
  return post<RevenueEntry>('/revenue', data).then((r) => convertKeys<RevenueEntry>(r));
}

// ── Accident reports (per vehicle) ────────────────────────────────────────────

export function getAccidentsForVehicle(vehicleId: string): Promise<AccidentReport[]> {
  return get<AccidentReport[]>(`/accidents/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => convertKeys<AccidentReport>(r)),
  );
}

export function createAccidentReport(data: Partial<AccidentReport>): Promise<AccidentReport> {
  return post<AccidentReport>('/accidents', data).then((r) => convertKeys<AccidentReport>(r));
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

// ── Valuations (per vehicle) ──────────────────────────────────────────────────

export function getValuationsForVehicle(vehicleId: string): Promise<Valuation[]> {
  return get<Valuation[]>(`/valuations/vehicle/${vehicleId}`).then((rows) =>
    rows.map((r) => convertKeys<Valuation>(r)),
  );
}

export function createValuation(data: Partial<Valuation>): Promise<Valuation> {
  return post<Valuation>('/valuations', data).then((r) => convertKeys<Valuation>(r));
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
