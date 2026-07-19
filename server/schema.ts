import { execute } from './db';

// Initialize database schema
export async function initializeSchema(): Promise<void> {
  // Admin users table
  await execute(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Sessions table
  await execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await execute(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);

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

  // Add indexes for performance
  await execute(`CREATE INDEX IF NOT EXISTS idx_drivers_supervisor ON drivers(supervisor_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(current_driver_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON vehicle_documents(vehicle_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_service_vehicle ON service_logs(vehicle_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_battery_vehicle ON battery_logs(vehicle_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_tyre_vehicle ON tyre_logs(vehicle_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_revenue_vehicle ON revenue_entries(vehicle_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_revenue_driver ON revenue_entries(driver_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_accidents_vehicle ON accident_reports(vehicle_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_accidents_driver ON accident_reports(driver_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_photos_vehicle ON vehicle_photos(vehicle_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_valuations_vehicle ON valuations(vehicle_id)`);

  // Inspections table
  await execute(`
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id),
      driver_name TEXT NOT NULL,
      inspection_date TEXT NOT NULL,
      overall_status TEXT NOT NULL,
      checklist JSONB NOT NULL DEFAULT '[]',
      notes TEXT DEFAULT '',
      photo_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await execute(`CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicle_id)`);

  console.log('Database schema initialized successfully with indexes');
}
