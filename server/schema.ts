import { pool, execute } from './db';

async function run(sql: string, label: string) {
  console.log(`  [schema] ${label}...`);
  await pool.query(sql);
  console.log(`  [schema] ${label} ✓`);
}

export async function initializeSchema(): Promise<void> {
  const t0 = Date.now();

  await run(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`, 'extensions');
  await run(`CREATE EXTENSION IF NOT EXISTS pg_trgm`, 'pg_trgm');

  await run(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql
  `, 'function update_updated_at');

  await run(`
    CREATE OR REPLACE FUNCTION log_audit_event()
    RETURNS TRIGGER AS $$
    DECLARE _changes JSONB;
    BEGIN
      _changes = jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW));
      INSERT INTO audit_log (table_name, operation, record_id, changed_by, changes)
      VALUES (TG_TABLE_NAME, TG_OP, COALESCE(NEW.id::TEXT, OLD.id::TEXT),
              current_setting('app.current_user_id', TRUE), _changes);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `, 'function log_audit_event');

  // Tables
  await run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','manager','viewer')),
      must_change_password BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table admin_users');

  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table sessions');

  await run(`
    CREATE TABLE IF NOT EXISTS supervisors (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      region TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `, 'table supervisors');

  await run(`
    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      license_number TEXT NOT NULL UNIQUE,
      supervisor_id TEXT REFERENCES supervisors(id) ON DELETE SET NULL,
      hire_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave','terminated')),
      photo_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `, 'table drivers');

  await run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      plate_number TEXT NOT NULL UNIQUE,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL CHECK (year >= 1990 AND year <= 2100),
      vin TEXT NOT NULL UNIQUE,
      purchase_date TEXT NOT NULL,
      purchase_price NUMERIC NOT NULL CHECK (purchase_price >= 0),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','in_repair','decommissioned','sold')),
      current_driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `, 'table vehicles');

  await run(`
    CREATE TABLE IF NOT EXISTS vehicle_documents (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      expiry_date TEXT,
      notes TEXT,
      search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(file_name, '') || ' ' || COALESCE(doc_type, '') || ' ' || COALESCE(notes, ''))
      ) STORED,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table vehicle_documents');

  await run(`
    CREATE TABLE IF NOT EXISTS service_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      service_date TEXT NOT NULL,
      mileage_km INTEGER NOT NULL CHECK (mileage_km >= 0),
      service_type TEXT NOT NULL,
      parts_replaced TEXT NOT NULL,
      workshop TEXT NOT NULL,
      cost NUMERIC NOT NULL CHECK (cost >= 0),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table service_logs');

  await run(`
    CREATE TABLE IF NOT EXISTS battery_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      install_date TEXT NOT NULL,
      replacement_date TEXT,
      brand TEXT NOT NULL,
      supplier TEXT NOT NULL,
      cost NUMERIC NOT NULL CHECK (cost >= 0),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table battery_logs');

  await run(`
    CREATE TABLE IF NOT EXISTS tyre_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      position TEXT NOT NULL,
      install_date TEXT NOT NULL,
      replacement_date TEXT,
      brand TEXT NOT NULL,
      cost NUMERIC NOT NULL CHECK (cost >= 0),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table tyre_logs');

  await run(`
    CREATE TABLE IF NOT EXISTS revenue_entries (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
      trip_date TEXT NOT NULL,
      trip_reference TEXT NOT NULL,
      route TEXT NOT NULL,
      client TEXT NOT NULL,
      amount NUMERIC NOT NULL CHECK (amount >= 0),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table revenue_entries');

  await run(`
    CREATE TABLE IF NOT EXISTS accident_reports (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
      accident_date TEXT NOT NULL,
      description TEXT NOT NULL,
      cost NUMERIC NOT NULL CHECK (cost >= 0),
      driver_at_fault BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table accident_reports');

  await run(`
    CREATE TABLE IF NOT EXISTS vehicle_photos (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      caption TEXT NOT NULL,
      taken_at TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table vehicle_photos');

  await run(`
    CREATE TABLE IF NOT EXISTS valuations (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      valuation_date TEXT NOT NULL,
      source TEXT NOT NULL,
      amount NUMERIC NOT NULL CHECK (amount >= 0),
      condition_notes TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table valuations');

  await run(`
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      driver_name TEXT NOT NULL,
      inspection_date TEXT NOT NULL,
      overall_status TEXT NOT NULL CHECK (overall_status IN ('pass','fail','flagged')),
      checklist JSONB NOT NULL DEFAULT '[]',
      notes TEXT DEFAULT '',
      photo_count INTEGER DEFAULT 0 CHECK (photo_count >= 0),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table inspections');

  await run(`
    CREATE TABLE IF NOT EXISTS search_history (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      query TEXT NOT NULL,
      result_count INTEGER NOT NULL DEFAULT 0,
      entity_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table search_history');

  await run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
      record_id TEXT NOT NULL,
      changed_by TEXT,
      changes JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, 'table audit_log');

  // Events partitioned table
  await run(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at)
  `, 'table events');

  // Create monthly partitions
  await run(`
    DO $$
    DECLARE
      partition_name TEXT;
      start_date TEXT;
      end_date TEXT;
    BEGIN
      partition_name := 'events_' || to_char(CURRENT_DATE, 'YYYY_MM');
      start_date := to_char(CURRENT_DATE, 'YYYY-MM-01');
      end_date := to_char(CURRENT_DATE + INTERVAL '1 month', 'YYYY-MM-01');
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name AND n.nspname = 'public'
      ) THEN
        EXECUTE format(
          'CREATE TABLE %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
          partition_name, start_date, end_date
        );
      END IF;

      partition_name := 'events_' || to_char(CURRENT_DATE + INTERVAL '1 month', 'YYYY_MM');
      start_date := to_char(CURRENT_DATE + INTERVAL '1 month', 'YYYY-MM-01');
      end_date := to_char(CURRENT_DATE + INTERVAL '2 months', 'YYYY-MM-01');
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name AND n.nspname = 'public'
      ) THEN
        EXECUTE format(
          'CREATE TABLE %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
          partition_name, start_date, end_date
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Could not create event partition: %', SQLERRM;
    END $$;
  `, 'events partitions');

  // Column drift fixes — CREATE TABLE IF NOT EXISTS above only runs for brand-new
  // tables, so a table already created by an earlier version of this schema never
  // gets new columns added automatically. Patch known drift here for every table
  // that later queries/indexes rely on having created_at/updated_at (and, for the
  // three soft-deletable tables, deleted_at). Safe to re-run — ADD COLUMN IF NOT
  // EXISTS no-ops when the column is already present.
  const timestampColumnTables = [
    'admin_users', 'supervisors', 'drivers', 'vehicles',
    'vehicle_documents', 'service_logs', 'battery_logs', 'tyre_logs',
    'revenue_entries', 'accident_reports', 'vehicle_photos', 'valuations',
    'inspections',
  ];
  const softDeleteTables = ['supervisors', 'drivers', 'vehicles'];

  for (const tbl of timestampColumnTables) {
    await run(
      `ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
       ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`,
      `migrate ${tbl}.created_at/updated_at`
    );
  }
  for (const tbl of softDeleteTables) {
    await run(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`, `migrate ${tbl}.deleted_at`);
  }

  // MinIO object storage columns — documents/receipts/reports are real uploaded
  // files now (private bucket, accessed via short-lived signed URLs), not just a
  // filename string. Photos/avatars stay as a plain public URL in image_url /
  // photo_url (unchanged), but we also record the object_key so a photo/avatar
  // can be deleted from the bucket later if its row is deleted.
  await run(`
    ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS object_key TEXT;
    ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS bucket TEXT;
    ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
    ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
  `, 'migrate vehicle_documents storage columns');

  await run(`
    ALTER TABLE vehicle_photos ADD COLUMN IF NOT EXISTS object_key TEXT;
  `, 'migrate vehicle_photos.object_key');

  await run(`
    ALTER TABLE drivers ADD COLUMN IF NOT EXISTS photo_object_key TEXT;
  `, 'migrate drivers.photo_object_key');

  // Indexes — batch into one statement per logical group
  await run(`
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at DESC);
    CREATE INDEX IF NOT EXISTS idx_drivers_supervisor ON drivers(supervisor_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(current_driver_id);
  `, 'indexes batch 1 (sessions + FK)');

  await run(`
    CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON vehicle_documents(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_service_vehicle ON service_logs(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_battery_vehicle ON battery_logs(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_tyre_vehicle ON tyre_logs(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_revenue_vehicle ON revenue_entries(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_revenue_driver ON revenue_entries(driver_id);
    CREATE INDEX IF NOT EXISTS idx_accidents_vehicle ON accident_reports(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_accidents_driver ON accident_reports(driver_id);
    CREATE INDEX IF NOT EXISTS idx_photos_vehicle ON vehicle_photos(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_valuations_vehicle ON valuations(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicle_id);
  `, 'indexes batch 2 (child FK)');

  await run(`
    CREATE INDEX IF NOT EXISTS idx_service_vehicle_date ON service_logs(vehicle_id, service_date DESC);
    CREATE INDEX IF NOT EXISTS idx_battery_vehicle_date ON battery_logs(vehicle_id, install_date DESC);
    CREATE INDEX IF NOT EXISTS idx_tyre_vehicle_date ON tyre_logs(vehicle_id, install_date DESC);
    CREATE INDEX IF NOT EXISTS idx_revenue_vehicle_date ON revenue_entries(vehicle_id, trip_date DESC);
    CREATE INDEX IF NOT EXISTS idx_accidents_vehicle_date ON accident_reports(vehicle_id, accident_date DESC);
    CREATE INDEX IF NOT EXISTS idx_documents_vehicle_date ON vehicle_documents(vehicle_id, issue_date DESC);
    CREATE INDEX IF NOT EXISTS idx_photos_vehicle_date ON vehicle_photos(vehicle_id, taken_at DESC);
    CREATE INDEX IF NOT EXISTS idx_valuations_vehicle_date ON valuations(vehicle_id, valuation_date DESC);
    CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_date ON inspections(vehicle_id, inspection_date DESC);
  `, 'indexes batch 3 (composite)');

  await run(`
    CREATE INDEX IF NOT EXISTS idx_vehicles_created ON vehicles(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date DESC);
    CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number) INCLUDE (make, model, status);
  `, 'indexes batch 4 (sort + covering)');

  await run(`
    CREATE INDEX IF NOT EXISTS idx_documents_search ON vehicle_documents USING GIN(search_vector);
    CREATE INDEX IF NOT EXISTS idx_revenue_client_route_search ON revenue_entries USING GIN(to_tsvector('english', client || ' ' || route));
    CREATE INDEX IF NOT EXISTS idx_vehicles_plate_trgm ON vehicles USING GIN(plate_number gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_drivers_name_trgm ON drivers USING GIN(full_name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_drivers_license_trgm ON drivers USING GIN(license_number gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_vehicles_vin_trgm ON vehicles USING GIN(vin gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_inspections_checklist ON inspections USING GIN(checklist);
  `, 'indexes batch 5 (GIN/trigram)');

  await run(`
    CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(id) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(id) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
    CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(table_name, record_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_type, entity_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_data ON events USING GIN(data);
  `, 'indexes batch 6 (misc)');

  // Triggers — updated_at for all tables + audit for select tables
  const allTables = [
    'admin_users', 'supervisors', 'drivers', 'vehicles',
    'vehicle_documents', 'service_logs', 'battery_logs', 'tyre_logs',
    'revenue_entries', 'accident_reports', 'vehicle_photos', 'valuations',
    'inspections',
  ];
  const auditTables = ['admin_users', 'drivers', 'vehicles', 'vehicle_documents', 'accident_reports'];

  for (const tbl of allTables) {
    const hasAudit = auditTables.includes(tbl);
    const sql = `
      DROP TRIGGER IF EXISTS trg_${tbl}_updated_at ON ${tbl};
      CREATE TRIGGER trg_${tbl}_updated_at
      BEFORE UPDATE ON ${tbl}
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `;
    await run(sql, `trigger updated_at on ${tbl}`);
    if (hasAudit) {
      await run(`
        DROP TRIGGER IF EXISTS trg_${tbl}_audit ON ${tbl};
        CREATE TRIGGER trg_${tbl}_audit
        AFTER INSERT OR UPDATE OR DELETE ON ${tbl}
        FOR EACH ROW
        EXECUTE FUNCTION log_audit_event();
      `, `trigger audit on ${tbl}`);
    }
  }

  // RLS
  await run(`ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY`, 'RLS admin_users');
  await run(`ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY`, 'RLS vehicles');
  await run(`ALTER TABLE drivers ENABLE ROW LEVEL SECURITY`, 'RLS drivers');

  await run(`
    DROP POLICY IF EXISTS admin_users_self ON admin_users;
    CREATE POLICY admin_users_self
    ON admin_users FOR ALL
    USING (id = current_setting('app.current_user_id', TRUE)::TEXT)
    WITH CHECK (id = current_setting('app.current_user_id', TRUE)::TEXT)
  `, 'policy admin_users_self');

  await run(`
    DROP POLICY IF EXISTS vehicles_all_authenticated ON vehicles;
    CREATE POLICY vehicles_all_authenticated
    ON vehicles FOR SELECT USING (true)
  `, 'policy vehicles_all');

  await run(`
    DROP POLICY IF EXISTS drivers_all_authenticated ON drivers;
    CREATE POLICY drivers_all_authenticated
    ON drivers FOR SELECT USING (true)
  `, 'policy drivers_all');

  // Session cleanup
  await run(`DELETE FROM sessions WHERE expires_at < NOW()`, 'cleanup expired sessions');
  await run(`DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '7 days'`, 'cleanup old sessions');

  // ANALYZE
  if (process.env.NODE_ENV !== 'production') {
    await run('ANALYZE', 'ANALYZE');
  }

  console.log(`Schema initialized in ${Date.now() - t0}ms`);
}
