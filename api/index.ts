// Vercel serverless entry point. `vercel.json` rewrites every request under
// /api/* to this single function; Express's own routing (mounted on the
// original /api/... paths in server/app.ts) handles the rest, so this file
// stays a thin adapter rather than duplicating any route logic.
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
