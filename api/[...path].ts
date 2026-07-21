// Vercel serverless entry point. Handles ALL /api/* requests.
// Uses dynamic import so that if the Express app fails to load, we return a
// descriptive error instead of FUNCTION_INVOCATION_FAILED.

let appInstance: any = null;
let readyPromise: Promise<boolean> | null = null;

async function loadApp() {
  if (appInstance) return { app: appInstance, ready: readyPromise! };

  try {
    const mod = await import('../server/app');
    appInstance = mod.app;
    readyPromise = Promise.race([
      mod.dbReady.then(() => true).catch(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 5000)),
    ]);
    return { app: appInstance, ready: readyPromise };
  } catch (err: any) {
    console.error('Failed to load Express app:', err?.message || err);
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  // Vercel strips the /api prefix when routing to catch-all functions.
  // Express routes are mounted at /api/..., so restore the prefix.
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  try {
    const { app, ready } = await loadApp();
    await ready;
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel handler error:', err?.message || err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        error: 'Backend failed to start',
        detail: process.env.NODE_ENV === 'production' ? undefined : String(err?.message || err),
      });
    }
  }
}
