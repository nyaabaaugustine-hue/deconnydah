import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSchema } from './schema';
import { healthCheck } from './db';
import { rateLimit } from './rateLimit';
import { requestLogger } from './logger';
import vehiclesRouter from './routes/vehicles';
import driversRouter from './routes/drivers';
import documentsRouter from './routes/documents';
import servicesRouter from './routes/services';
import batteryRouter from './routes/battery';
import tyresRouter from './routes/tyres';
import revenueRouter from './routes/revenue';
import accidentsRouter from './routes/accidents';
import photosRouter from './routes/photos';
import valuationsRouter from './routes/valuations';
import inspectionsRouter from './routes/inspections';
import supervisorsRouter from './routes/supervisors';
import authRouter from './routes/auth';
import uploadsRouter from './routes/uploads';
import searchRouter from './routes/search';
import statsRouter from './routes/stats';
import auditLogsRouter from './routes/audit-logs';
import searchHistoryRouter from './routes/search-history';
import { seedDefaultAdmin } from './auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vercel sets this automatically on every deployment (build, function, edge).
// We use it to switch behavior that only makes sense for a single long-running
// process (Render/Docker/local) vs. a stateless serverless function (Vercel).
const isVercel = Boolean(process.env.VERCEL);

export const app = express();

// ── Security ──────────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      // 'self' covers our own API; api.cloudinary.com is needed because the browser
      // uploads image bytes directly to Cloudinary using the signed params we hand it
      // (POST /api/uploads/cloudinary-signature) — the file itself never touches our server.
      connectSrc: ["'self'", 'https://api.cloudinary.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';
// Vite auto-increments the dev port (5173 -> 5174 -> 5175...) whenever the
// previous port is still occupied by another running instance. Hardcoding a
// single port in ALLOWED_ORIGINS meant every login broke the moment two dev
// servers were running at once. In non-production, trust any localhost/127.0.0.1
// origin regardless of port; production still only trusts the explicit allowlist.
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Vercel preview deployments each get a unique, unguessable *.vercel.app
// subdomain generated per-build — there's no way to know it ahead of time to
// add to ALLOWED_ORIGINS. When actually running on Vercel, trust any
// *.vercel.app origin so preview URLs work out of the box; every request still
// requires a valid Bearer token regardless of origin, so this doesn't weaken auth.
const vercelPreviewPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      (!isProduction && localhostOriginPattern.test(origin)) ||
      (isVercel && vercelPreviewPattern.test(origin))
    ) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// ── Logging & rate limiting ───────────────────────────────────────────────────
// NOTE: the in-memory rate limiter (server/rateLimit.ts) only works correctly
// on a single long-running process (Render/Docker/local). On Vercel each
// invocation may land on a different function instance, so counts reset
// unpredictably — it still runs (no harm), but don't rely on it as your only
// brute-force protection in a Vercel deployment.

app.use(requestLogger);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Try again in 15 minutes.' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 120 }));

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/battery', batteryRouter);
app.use('/api/tyres', tyresRouter);
app.use('/api/revenue', revenueRouter);
app.use('/api/accidents', accidentsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/valuations', valuationsRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/supervisors', supervisorsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/search', searchRouter);
app.use('/api/stats', statsRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/search-history', searchHistoryRouter);

app.get('/api/health', async (_req, res) => {
  const isHealthy = await healthCheck();
  res.json({ status: isHealthy ? 'ok' : 'error', timestamp: new Date().toISOString() });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Serve the built frontend (Render/Docker/local only) ──────────────────────
// Lets a single server process (e.g. one Render web service) serve both the API
// and the compiled Vite app from `dist/`, so the site actually loads when this
// process is the only thing deployed. In local dev the frontend runs separately
// via `npm run dev` on :5173, and `dist/` may not exist yet — the static
// middleware and catch-all below simply no-op (404) until `npm run build` has run.
//
// On Vercel this is skipped entirely: Vercel serves `dist/` as static output
// directly (via `outputDirectory` in vercel.json) and rewrites `/api/*` to this
// function itself — the `dist` folder isn't even bundled alongside the
// serverless function, so path.join(__dirname, '..', 'dist') wouldn't resolve
// to anything meaningful there.
if (!isVercel) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  // SPA fallback — every non-API, non-static request serves index.html.
  // Uses a middleware (not a route pattern) to avoid path-to-regexp v8
  // compatibility issues with catch-all patterns in Express 5.
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// ── Database init ─────────────────────────────────────────────────────────────
// Fire-and-forget at module load (not inside a request handler) so it runs once
// per cold start / process start, not once per request. Non-blocking so the
// first request doesn't wait on it — routes that need the schema already query
// Postgres directly and will simply error until this resolves, which in
// practice finishes well before Neon's first real query on a fresh instance.
initializeSchema()
  .then(() => seedDefaultAdmin())
  .then(() => console.log('Database ready'))
  .catch((error) => {
    console.error('Schema init failed:', error.message);
  });
