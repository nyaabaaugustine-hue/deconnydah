/**
 * Database configuration constants for Neon PostgreSQL.
 *
 * Centralizes pagination limits, search defaults, Neon pool tuning,
 * and other tunable knobs so they're consistent across all routes.
 */
export declare const DB_CONFIG: {
    readonly pagination: {
        /** Default page size when the client omits ?limit=N */
        readonly defaultLimit: 50;
        /** Hard upper bound — clients asking for more than this get silently capped */
        readonly maxLimit: 1000;
        /** Keyset-pagination cursor column */
        readonly cursorColumn: "id";
        /** Default sort direction for list endpoints */
        readonly defaultOrder: "DESC";
    };
    readonly search: {
        /** Default number of search results returned */
        readonly defaultLimit: 20;
        /** Maximum search results (prevents runaway queries) */
        readonly maxLimit: 100;
        /** Minimum query length before we bother running a search */
        readonly minQueryLength: 2;
        /** Maximum length of a search term (prevents abuse) */
        readonly maxQueryLength: 500;
        /** Full-text search configuration name (english, simple, etc.) */
        readonly textSearchConfig: "english";
    };
    readonly pool: {
        /** Maximum simultaneous connections in the pool */
        readonly maxConnections: 20;
        /** Close idle connections after N milliseconds */
        readonly idleTimeoutMs: 30000;
        /** Wait N milliseconds for a connection from the pool before timing out */
        readonly connectionTimeoutMs: 10000;
        /** Maximum number of connection retries on transient failure */
        readonly maxRetries: 3;
        /** Delay between retries (ms) */
        readonly retryDelayMs: 250;
        /** Allow the pool to queue requests when all connections are busy */
        readonly allowExitOnIdle: false;
    };
    /** Use the Neon pooled connection string (append ?pgbouncer=true or use -pooler host) */
    readonly usePooler: true;
    /** Enable Neon's fetch connection cache for serverless environments */
    readonly fetchConnectionCache: true;
    readonly performance: {
        /** Target query execution time (ms) */
        readonly targetQueryTimeMs: 50;
        /** Target search execution time (ms) */
        readonly targetSearchTimeMs: 30;
        /** Target cache hit ratio (0-1) */
        readonly targetCacheHitRatio: 0.95;
    };
    readonly session: {
        /** Session TTL (days) */
        readonly ttlDays: 7;
        /** Cleanup interval for expired sessions (ms) */
        readonly cleanupIntervalMs: number;
    };
};
/**
 * SQL column-name helpers.
 * Centralised so route files don't hardcode column lists everywhere.
 */
export declare const TABLE_COLUMNS: {
    readonly vehicles: readonly ["id", "plate_number", "make", "model", "year", "vin", "purchase_date", "purchase_price", "status", "current_driver_id", "created_at", "updated_at"];
    readonly drivers: readonly ["id", "full_name", "phone", "license_number", "supervisor_id", "hire_date", "status", "photo_url", "created_at", "updated_at"];
    readonly supervisors: readonly ["id", "full_name", "phone", "region", "created_at", "updated_at"];
    readonly documents: readonly ["id", "vehicle_id", "doc_type", "file_name", "issue_date", "expiry_date", "notes", "created_at", "updated_at"];
    readonly serviceLogs: readonly ["id", "vehicle_id", "service_date", "mileage_km", "service_type", "parts_replaced", "workshop", "cost", "created_at", "updated_at"];
    readonly batteryLogs: readonly ["id", "vehicle_id", "install_date", "replacement_date", "brand", "supplier", "cost", "created_at", "updated_at"];
    readonly tyreLogs: readonly ["id", "vehicle_id", "position", "install_date", "replacement_date", "brand", "cost", "created_at", "updated_at"];
    readonly revenueEntries: readonly ["id", "vehicle_id", "driver_id", "trip_date", "trip_reference", "route", "client", "amount", "created_at", "updated_at"];
    readonly accidents: readonly ["id", "vehicle_id", "driver_id", "accident_date", "description", "cost", "driver_at_fault", "created_at", "updated_at"];
    readonly photos: readonly ["id", "vehicle_id", "category", "caption", "taken_at", "image_url", "created_at", "updated_at"];
    readonly valuations: readonly ["id", "vehicle_id", "valuation_date", "source", "amount", "condition_notes", "created_at", "updated_at"];
    readonly inspections: readonly ["id", "vehicle_id", "driver_name", "inspection_date", "overall_status", "checklist", "notes", "photo_count", "created_at", "updated_at"];
};
