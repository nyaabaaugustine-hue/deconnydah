import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeSchema } from './schema';
import { healthCheck, closePool } from './db';
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
import { seedDefaultAdmin } from './auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security ──────────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// ── Logging & rate limiting ───────────────────────────────────────────────────

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

app.get('/api/health', async (_req, res) => {
  const isHealthy = await healthCheck();
  res.json({ status: isHealthy ? 'ok' : 'error', timestamp: new Date().toISOString() });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function start() {
  try {
    await initializeSchema();
    await seedDefaultAdmin();
    console.log('Database ready');

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { await closePool(); process.exit(0); });
process.on('SIGINT', async () => { await closePool(); process.exit(0); });

start();
