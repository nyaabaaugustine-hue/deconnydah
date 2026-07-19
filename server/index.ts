import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeSchema } from './schema';
import { healthCheck, closePool } from './db';
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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());

// CORS: restrict to configured origin(s) instead of allowing any origin.
// Set ALLOWED_ORIGINS in .env as a comma-separated list, e.g.
// ALLOWED_ORIGINS=http://localhost:5173,https://your-production-domain.com
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (curl, server-to-server, no Origin header) through.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  })
);

app.use(express.json());

// Routes
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

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const isHealthy = await healthCheck();
  res.json({ status: isHealthy ? 'ok' : 'error', timestamp: new Date().toISOString() });
});

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Central error handler — must be registered last, after all routes.
// Anything passed to next(err) (including errors thrown inside asyncHandler-wrapped
// route handlers) ends up here instead of crashing the process or hanging the request.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize schema and start server
async function start() {
  try {
    await initializeSchema();
    console.log('Database schema initialized');
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await closePool();
  process.exit(0);
});

start();
