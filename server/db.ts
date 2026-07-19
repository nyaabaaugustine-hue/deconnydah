import { Pool, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database URL from environment variable
const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set. Server cannot start.');
  process.exit(1);
}

// Configure Neon for serverless environments
neonConfig.fetchConnectionCache = true;

// Create connection pool
export const pool = new Pool({ connectionString: DATABASE_URL });

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
