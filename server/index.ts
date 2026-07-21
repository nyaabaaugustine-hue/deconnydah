// Entry point for Render, Docker, and local `npm run server` — a single
// long-running Node process that both listens on a port and serves the API.
// Vercel does NOT use this file; it uses `api/index.ts`, which imports the
// same `app` from `./app` but never calls `.listen()` (Vercel's runtime does
// that itself around the exported handler).
import { app, dbReady } from './app';
import { closePool } from './db';

const PORT = process.env.PORT || 3001;

// Wait for schema + seed to complete before accepting traffic.
dbReady.then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});

process.on('SIGTERM', async () => { await closePool(); process.exit(0); });
process.on('SIGINT', async () => { await closePool(); process.exit(0); });
