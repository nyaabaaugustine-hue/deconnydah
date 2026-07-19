import { Pool, neonConfig } from '@neondatabase/serverless';

// Get database URL from environment variable
// NOTE: Do NOT use VITE_ prefix - database credentials must not be exposed to the browser
const DATABASE_URL = import.meta.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.warn('DATABASE_URL not set. Database features will be unavailable.');
}

// Configure Neon for serverless environments
neonConfig.fetchConnectionCache = true;

// Create connection pool
const pool = new Pool({ connectionString: DATABASE_URL });

// Helper: Execute a query and return results
export async function query<T = Record<string, any>>(queryText: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(queryText, params ?? []);
  return result.rows as T[];
}

// Helper: Execute a single row query
export async function queryOne<T = Record<string, any>>(queryText: string, params?: any[]): Promise<T | null> {
  const results = await query<T>(queryText, params);
  return results[0] ?? null;
}

// Helper: Execute an insert/update/delete statement
export async function execute(queryText: string, params?: any[]): Promise<{ rowCount: number }> {
  const result = await pool.query(queryText, params ?? []);
  return { rowCount: result.rowCount ?? 0 };
}

// Database health check
export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Close pool connection
export async function closePool(): Promise<void> {
  await pool.end();
}
