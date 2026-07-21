import { Pool, neonConfig, PoolConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// ── Environment ────────────────────────────────────────────────────────────────
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  // Throwing (rather than process.exit) keeps this safe to import inside a
  // Vercel serverless function, where killing the whole process is more
  // disruptive than a normal module-load error. On Render/Docker/local this
  // still stops the server from starting, same as before.
  throw new Error('DATABASE_URL not set. Server cannot start.');
}

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

// ── Neon Configuration ─────────────────────────────────────────────────────────
// fetchConnectionCache avoids redundant TLS handshakes in serverless contexts
// (Vercel Edge, Neon's own proxy, etc.)
neonConfig.fetchConnectionCache = true;

// ── Pool Configuration ─────────────────────────────────────────────────────────
const poolConfig: PoolConfig = {
  connectionString: DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000', 10),
  allowExitOnIdle: false,
};

export const pool = new Pool(poolConfig);

// Log pool errors so they don't silently swallow
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

// ── Query Execution Helpers ────────────────────────────────────────────────────

/**
 * Execute a query and return all matching rows.
 * In development mode, logs query text + params to aid debugging.
 */
export async function query<T = Record<string, any>>(queryText: string, params?: any[]): Promise<T[]> {
  if (isDev) {
    console.debug('SQL:', queryText.substring(0, 200), params ? JSON.stringify(params).substring(0, 200) : '');
  }
  const result = await pool.query(queryText, params ?? []);
  return result.rows as T[];
}

/**
 * Execute a query and return the first row, or null if no rows match.
 */
export async function queryOne<T = Record<string, any>>(queryText: string, params?: any[]): Promise<T | null> {
  const results = await query<T>(queryText, params);
  return results[0] ?? null;
}

/**
 * Execute an INSERT / UPDATE / DELETE and return the affected row count.
 */
export async function execute(queryText: string, params?: any[]): Promise<{ rowCount: number }> {
  const result = await pool.query(queryText, params ?? []);
  return { rowCount: result.rowCount ?? 0 };
}

/**
 * Execute multiple statements inside a single transaction.
 * If any statement fails, the entire transaction is rolled back.
 */
export async function transaction<T>(
  callback: (queryFn: typeof query) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txQuery = async <U>(text: string, params?: any[]) => {
      const result = await client.query(text, params ?? []);
      return result.rows as U[];
    };
    const result = await callback(txQuery);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── Health / Lifecycle ─────────────────────────────────────────────────────────

/** Quick database connectivity check (used by /api/health). */
export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/** Detailed health stats for observability dashboards. */
export async function healthDetail() {
  const start = Date.now();
  const alive = await healthCheck();
  const latencyMs = Date.now() - start;
  return {
    alive,
    latencyMs,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/** Gracefully close all pool connections (call on shutdown). */
export async function closePool(): Promise<void> {
  await pool.end();
}
