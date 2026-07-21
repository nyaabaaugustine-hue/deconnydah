// Vercel serverless entry point. Handles ALL /api/* requests.
// Express's own routing (mounted on /api/... paths in server/app.ts) handles
// the rest.
import { app, dbReady } from '../server/app';

// 5-second timeout: if DB is unreachable, still serve requests (DB queries will
// fail individually, but the API is reachable).
const ready = Promise.race([
  dbReady.then(() => true).catch(() => true),
  new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 5000)),
]);

export default async function handler(req: any, res: any) {
  // Vercel strips the /api prefix when routing to functions in the api/
  // directory.  Express routes are mounted at /api/..., so we must restore it.
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }

  try {
    await ready;
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
