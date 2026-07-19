import { query, execute } from './db';

// Initialize database schema
export async function initializeSchema(): Promise<void> {
  // Supervisors table
  await execute(`
    CREATE TABLE IF NOT EXISTS supervisors (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      region TEXT NOT NULL
    )
  `);

  // Drivers table
  await execute(`
    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      license_number TEXT NOT NULL,
      supervisor_id TEXT REFERENCES supervisors(id),
      hire_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    )
  `);

  // Vehicles table
  await execute(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      plate_number TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      vin TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      purchase_price NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      current_driver_id TEXT REFERENCES drivers(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Vehicle documents table
  await execute(`
    CREATE TABLE IF NOT EXISTS vehicle_documents (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id),
      doc_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      expiry_date TEXT,
      notes TEXT
    )
  `);

  // Service logs table
  await execute(`
    CREATE TABLE IF NOT EXISTS service_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id),
      service_date TEXT NOT NULL,
      mileage_km INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      parts_replaced TEXT NOT NULL,
      workshop TEXT NOT NULL,
      cost NUMERIC NOT NULL
    )
  `);

  // Battery logs table
  await execute(`
    CREATE TABLE IF NOT EXISTS battery_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id),
      install_date TEXT NOT NULL,
      replacement_date TEXT,
      brand TEXT NOT NULL,
      supplier TEXT NOT NULL,
      cost NUMERIC NOT NULL
    )
  `);

  // Tyre logs table
  await execute(`
    CREATE TABLE IF NOT EXISTS tyre_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id),
      position TEXT NOT NULL,
      install_date TEXT NOT NULL,
      replacement_date TEXT,
      brand TEXT NOT NULL,
      cost NUMERIC NOT NULL
    )
  `);

  // Revenue entries table
  await execute(`
    CREATE TABLE IF NOT EXISTS revenue_entries (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id),
      driver_id TEXT REFERENCES drivers(id),
      trip_date TEXT NOT NULL,
      trip_reference TEXT NOT NULL,
      route TEXT NOT NULL,
      client TEXT NOT NULL,
      amount NUMERIC NOT NULL
    )
  `);

  // Accident reports table
  await execute(`
    CREATE TABLE IF NOT EXISTS accident_reports (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id),
      driver_id TEXT REFERENCES drivers(id),
      accident_date TEXT NOT NULL,
      description TEXT NOT NULL,
      cost NUMERIC NOT NULL,
      driver_at_fault BOOLEAN NOT NULL
    )
  `);

  // Vehicle photos table
  await execute(`
    CREATE TABLE IF NOT EXISTS vehicle_photos (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id),
      category TEXT NOT NULL,
      caption TEXT NOT NULL,
      taken_at TEXT NOT NULL
    )
  `);

  // Valuations table
  await execute(`
    CREATE TABLE IF NOT EXISTS valuations (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id),
      valuation_date TEXT NOT NULL,
      source TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      condition_notes TEXT NOT NULL
    )
  `);

  console.log('Database schema initialized successfully');
}
