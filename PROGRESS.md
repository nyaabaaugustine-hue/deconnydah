# Implementation Progress — Degoony Evergreen Fleet

Cross-reference with `production-readiness-plan.md` in this same folder for full context on *why*
each item matters. This file tracks *what has actually been done in the code* so you (or I, in a
future session) can pick up exactly where things left off.

## Status: IN PROGRESS (Phases 1–3 complete)

## ✅ Done

### Phase 1: Backend routes (complete)
- `server/routes/vehicles.ts` — full CRUD with status validation
- `server/routes/drivers.ts` — full CRUD
- `server/routes/supervisors.ts` — full CRUD
- `server/routes/inspections.ts` — full CRUD with JSONB checklist
- `server/routes/documents.ts`, `services.ts`, `battery.ts`, `tyres.ts`, `revenue.ts`, `accidents.ts`, `photos.ts`, `valuations.ts` — read + create per vehicle
- `server/db.ts` — Neon pool connection with `query`/`queryOne`/`execute`/`healthCheck`/`closePool`
- `server/schema.ts` — all table DDL including `inspections` table
- `server/types.ts` — re-exports from `src/types/fleet.ts`
- `server/validate.ts` — `requireFields`, `requireIdParam`, `asyncHandler`
- `server/index.ts` — Express app, CORS allowlist, all routes wired

### Phase 2: Frontend → real API (complete)
- `src/lib/apiClient.ts` — typed fetch wrappers with automatic snake↔camel conversion for all endpoints
- `src/lib/analytics.ts` — refactored to accept data params (no mock imports)
- `vite.config.ts` — `/api` proxy to `localhost:3001`
- `src/components/FleetDashboard.tsx` — real API fetch, loading/error states, Add Vehicle modal
- `src/components/VehicleProfile.tsx` — fetches vehicle + all 8 sub-resources, loading/error per tab
- `src/components/DriverManagement.tsx` — shadcn card-grid, real CRUD, edit/delete modals, search/filter
- `src/components/AnalyticsDashboard.tsx` — parallel API fetch, loading/error states
- `src/components/InspectionsView.tsx` — real API, add modal, review modal, stats, search/filter
- Dead files moved to `_deprecated_do_not_use/` (not deleted): `src-lib-api.ts`, `src-lib-db.ts`, `src-lib-schema.ts`

### Phase 3: Real authentication (complete)
- `server/auth.ts` — password hashing via Node `crypto.scrypt`, session tokens, `requireAuth` middleware, `seedDefaultAdmin()`
- `server/routes/auth.ts` — `/login`, `/me`, `/logout`, `/change-password` endpoints
- `server/schema.ts` — `admin_users` and `sessions` tables with indexes
- `server/index.ts` — auth route mounted, `seedDefaultAdmin()` called on startup
- `src/lib/apiClient.ts` — `login()`, `getMe()`, `logout()`, token management in localStorage
- `src/components/AdminLogin.tsx` — wired to real API (no more hardcoded admin/admin)
- `src/App.tsx` — auth state check on load, login gate, logout button in sidebar

## ⏭️ Not started yet
- Phase 0: Rotate Neon DB password (⚠️ you need to do this yourself in the Neon console — I cannot do this for you)
- Phase 4: Hardening (rate limiting, logging, DB constraints)
- Phase 5: Testing & CI
- Phase 6: Deployment

## Notes / decisions made
- Server routes return snake_case (raw DB rows); `apiClient.ts` converts to camelCase automatically via `toCamel()`/`convertKeys()`.
- `camelToSnake` reverse conversion applied on POST/PATCH request bodies.
- `analytics.ts` functions accept data params so they work with both mock and real data.
- Server generates IDs via `crypto.randomUUID()` rather than trusting client-supplied IDs.
- `server/types.ts` re-exports from `src/types/fleet.ts` — no duplication.
- `InspectionsView.tsx` self-contained `Inspection` type aligned with API shape (checklist stored as JSONB in Postgres).
- No `tsconfig.server.json` — server runs via `tsx` directly.
- Auth uses Node built-in `crypto.scrypt` for password hashing — no bcrypt dependency needed.
- Sessions stored in DB with 7-day expiry; `requireAuth` middleware validates Bearer token on protected routes.
- Default admin user seeded on startup: `admin` / `admin` — must change password after first login.
- Auth token stored in `localStorage` on client; attached as `Authorization: Bearer <token>` header.
