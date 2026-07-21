// Vercel catch-all serverless entry point. Its filename preserves the full
// /api/... request path, allowing Express routes mounted in server/app.ts to
// match without a rewrite that would discard the route suffix.
//
// An Express app instance is itself a valid (req, res) => void handler, which
// is exactly what Vercel's Node runtime expects as a function's default export
// — no extra wrapping needed.
import { app, dbReady } from '../server/app';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Wrap the Express app so Vercel's Node runtime awaits schema init before
// the first request is dispatched.  Without this, a cold-start request can
// hit a route before tables exist (the classic "relation does not exist" error).
let ready = dbReady.then(() => true).catch(() => true);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ready;
  return app(req, res);
}
