import { query, queryOne, execute } from './db';
import type {
  Vehicle, Driver, Supervisor, VehicleDocument,
  ServiceLog, BatteryLog, TyreLog, RevenueEntry,
  AccidentReport, VehiclePhoto, Valuation,
} from '@/types/fleet';

// ==================== VEHICLES ====================

export async function getVehicles(): Promise<Vehicle[]> {
  return query<Vehicle>(`SELECT * FROM vehicles ORDER BY created_at DESC`);
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  return queryOne<Vehicle>(`SELECT * FROM vehicles WHERE id = $1`, [id]);
}

export async function createVehicle(vehicle: Vehicle): Promise<Vehicle> {
  await execute(
    `INSERT INTO vehicles (id, plate_number, make, model, year, vin, purchase_date, purchase_price, status, current_driver_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [vehicle.id, vehicle.plateNumber, vehicle.make, vehicle.model, vehicle.year,
     vehicle.vin, vehicle.purchaseDate, vehicle.purchasePrice, vehicle.status, vehicle.currentDriverId]
  );
  return vehicle;
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return getVehicleById(id);

  values.push(id);
  await execute(
    `UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
  return getVehicleById(id);
}

export async function deleteVehicle(id: string): Promise<boolean> {
  const result = await execute(`DELETE FROM vehicles WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

// ==================== DRIVERS ====================

export async function getDrivers(): Promise<Driver[]> {
  return query<Driver>(`SELECT * FROM drivers ORDER BY full_name`);
}

export async function getDriverById(id: string): Promise<Driver | null> {
  return queryOne<Driver>(`SELECT * FROM drivers WHERE id = $1`, [id]);
}

export async function createDriver(driver: Driver): Promise<Driver> {
  await execute(
    `INSERT INTO drivers (id, full_name, phone, license_number, supervisor_id, hire_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [driver.id, driver.fullName, driver.phone, driver.licenseNumber,
     driver.supervisorId, driver.hireDate, driver.status]
  );
  return driver;
}

export async function updateDriver(id: string, updates: Partial<Driver>): Promise<Driver | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return getDriverById(id);

  values.push(id);
  await execute(
    `UPDATE drivers SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
  return getDriverById(id);
}

export async function deleteDriver(id: string): Promise<boolean> {
  const result = await execute(`DELETE FROM drivers WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

// ==================== DOCUMENTS ====================

export async function getDocumentsByVehicle(vehicleId: string): Promise<VehicleDocument[]> {
  return query<VehicleDocument>(
    `SELECT * FROM vehicle_documents WHERE vehicle_id = $1 ORDER BY issue_date DESC`,
    [vehicleId]
  );
}

export async function createDocument(doc: VehicleDocument): Promise<VehicleDocument> {
  await execute(
    `INSERT INTO vehicle_documents (id, vehicle_id, doc_type, file_name, issue_date, expiry_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [doc.id, doc.vehicleId, doc.docType, doc.fileName, doc.issueDate, doc.expiryDate, doc.notes]
  );
  return doc;
}

// ==================== SERVICE LOGS ====================

export async function getServiceLogsByVehicle(vehicleId: string): Promise<ServiceLog[]> {
  return query<ServiceLog>(
    `SELECT * FROM service_logs WHERE vehicle_id = $1 ORDER BY service_date DESC`,
    [vehicleId]
  );
}

export async function createServiceLog(log: ServiceLog): Promise<ServiceLog> {
  await execute(
    `INSERT INTO service_logs (id, vehicle_id, service_date, mileage_km, service_type, parts_replaced, workshop, cost)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [log.id, log.vehicleId, log.serviceDate, log.mileageKm, log.serviceType,
     log.partsReplaced, log.workshop, log.cost]
  );
  return log;
}

// ==================== BATTERY LOGS ====================

export async function getBatteryLogsByVehicle(vehicleId: string): Promise<BatteryLog[]> {
  return query<BatteryLog>(
    `SELECT * FROM battery_logs WHERE vehicle_id = $1 ORDER BY install_date DESC`,
    [vehicleId]
  );
}

export async function createBatteryLog(log: BatteryLog): Promise<BatteryLog> {
  await execute(
    `INSERT INTO battery_logs (id, vehicle_id, install_date, replacement_date, brand, supplier, cost)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [log.id, log.vehicleId, log.installDate, log.replacementDate, log.brand, log.supplier, log.cost]
  );
  return log;
}

// ==================== TYRE LOGS ====================

export async function getTyreLogsByVehicle(vehicleId: string): Promise<TyreLog[]> {
  return query<TyreLog>(
    `SELECT * FROM tyre_logs WHERE vehicle_id = $1 ORDER BY install_date DESC`,
    [vehicleId]
  );
}

export async function createTyreLog(log: TyreLog): Promise<TyreLog> {
  await execute(
    `INSERT INTO tyre_logs (id, vehicle_id, position, install_date, replacement_date, brand, cost)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [log.id, log.vehicleId, log.position, log.installDate, log.replacementDate, log.brand, log.cost]
  );
  return log;
}

// ==================== REVENUE ENTRIES ====================

export async function getRevenueByVehicle(vehicleId: string): Promise<RevenueEntry[]> {
  return query<RevenueEntry>(
    `SELECT * FROM revenue_entries WHERE vehicle_id = $1 ORDER BY trip_date DESC`,
    [vehicleId]
  );
}

export async function createRevenueEntry(entry: RevenueEntry): Promise<RevenueEntry> {
  await execute(
    `INSERT INTO revenue_entries (id, vehicle_id, driver_id, trip_date, trip_reference, route, client, amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [entry.id, entry.vehicleId, entry.driverId, entry.tripDate,
     entry.tripReference, entry.route, entry.client, entry.amount]
  );
  return entry;
}

// ==================== ACCIDENT REPORTS ====================

export async function getAccidentsByVehicle(vehicleId: string): Promise<AccidentReport[]> {
  return query<AccidentReport>(
    `SELECT * FROM accident_reports WHERE vehicle_id = $1 ORDER BY accident_date DESC`,
    [vehicleId]
  );
}

export async function createAccidentReport(report: AccidentReport): Promise<AccidentReport> {
  await execute(
    `INSERT INTO accident_reports (id, vehicle_id, driver_id, accident_date, description, cost, driver_at_fault)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [report.id, report.vehicleId, report.driverId, report.accidentDate,
     report.description, report.cost, report.driverAtFault]
  );
  return report;
}

// ==================== VEHICLE PHOTOS ====================

export async function getPhotosByVehicle(vehicleId: string): Promise<VehiclePhoto[]> {
  return query<VehiclePhoto>(
    `SELECT * FROM vehicle_photos WHERE vehicle_id = $1 ORDER BY taken_at DESC`,
    [vehicleId]
  );
}

export async function createVehiclePhoto(photo: VehiclePhoto): Promise<VehiclePhoto> {
  await execute(
    `INSERT INTO vehicle_photos (id, vehicle_id, category, caption, taken_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [photo.id, photo.vehicleId, photo.category, photo.caption, photo.takenAt]
  );
  return photo;
}

// ==================== VALUATIONS ====================

export async function getValuationsByVehicle(vehicleId: string): Promise<Valuation[]> {
  return query<Valuation>(
    `SELECT * FROM valuations WHERE vehicle_id = $1 ORDER BY valuation_date DESC`,
    [vehicleId]
  );
}

export async function createValuation(valuation: Valuation): Promise<Valuation> {
  await execute(
    `INSERT INTO valuations (id, vehicle_id, valuation_date, source, amount, condition_notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [valuation.id, valuation.vehicleId, valuation.valuationDate,
     valuation.source, valuation.amount, valuation.conditionNotes]
  );
  return valuation;
}
