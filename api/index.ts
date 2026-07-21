// Vercel serverless entry point. `vercel.json` rewrites every request under
// /api/* to this single function; Express's own routing (mounted on the
// original /api/... paths in server/app.ts) handles the rest, so this file
// stays a thin adapter rather than duplicating any route logic.
//
// An Express app instance is itself a valid (req, res) => void handler, which
// is exactly what Vercel's Node runtime expects as a function's default export
// — no extra wrapping needed.
import { app } from '../server/app';

export default app;
