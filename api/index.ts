import { app, dbReady } from '../server/app.js';
import type {VercelRequest, VercelResponse} from "@vercel/node";

/**
 * Vercel Serverless Function entry point.
 * This function bootstraps the Express app and handles all incoming API requests.
 * @see https://vercel.com/docs/functions/serverless-functions/runtimes/node-js
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Ensure the database schema is initialized before handling requests.
    await dbReady;
    // Pass the request to the Express app.
    app(req, res);
  } catch (error: any) {
    // Basic error handling.
    res.status(500).send(error.message);
  }
}
