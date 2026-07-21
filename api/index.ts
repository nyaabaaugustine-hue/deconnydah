// Vercel serverless entry point. Handles ALL /api/* requests via the
// rewrite in vercel.json.  Express's own routing (mounted on /api/...
// paths in server/app.ts) takes care of the rest.
import { app, dbReady } from '../server/app';

let ready = dbReady.then(() => true).catch(() => true);

export default async function handler(req: any, res: any) {
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
