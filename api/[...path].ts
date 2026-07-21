import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app, dbReady } from '../server/app.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Wait for schema init + admin seed before serving requests, so cold-start
  // requests don't race table creation (mirrors server/index.ts behavior).
  await dbReady;
  return app(req as any, res as any);
}
