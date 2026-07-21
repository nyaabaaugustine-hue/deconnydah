import { Pool } from '@neondatabase/serverless';
export declare const pool: Pool;
/**
 * Execute a query and return all matching rows.
 * In development mode, logs query text + params to aid debugging.
 */
export declare function query<T = Record<string, any>>(queryText: string, params?: any[]): Promise<T[]>;
/**
 * Execute a query and return the first row, or null if no rows match.
 */
export declare function queryOne<T = Record<string, any>>(queryText: string, params?: any[]): Promise<T | null>;
/**
 * Execute an INSERT / UPDATE / DELETE and return the affected row count.
 */
export declare function execute(queryText: string, params?: any[]): Promise<{
    rowCount: number;
}>;
/**
 * Execute an INSERT or UPDATE with a RETURNING clause and return the first
 * affected row (or null).  Use this instead of execute() + queryOne() to
 * save a round trip.
 */
export declare function executeReturning<T = Record<string, any>>(queryText: string, params?: any[]): Promise<T | null>;
/**
 * Execute multiple statements inside a single transaction.
 * If any statement fails, the entire transaction is rolled back.
 *
 * When `userId` is provided, sets `app.current_user_id` for the transaction
 * (transaction-scoped via set_config(..., true)), so audit triggers and RLS
 * policies can attribute actions to the authenticated user.  Must be used with
 * PgBouncer transaction pooling — the set_config call and all subsequent
 * queries run on the same checked-out client.
 */
export declare function transaction<T>(callback: (queryFn: typeof query) => Promise<T>, userId?: string): Promise<T>;
/** Quick database connectivity check (used by /api/health). */
export declare function healthCheck(): Promise<boolean>;
/** Detailed health stats for observability dashboards. */
export declare function healthDetail(): Promise<{
    alive: boolean;
    latencyMs: number;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
}>;
/** Gracefully close all pool connections (call on shutdown). */
export declare function closePool(): Promise<void>;
