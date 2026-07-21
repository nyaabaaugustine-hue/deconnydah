import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { RevenueEntry } from '../types';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const REVENUE_COLUMNS = [
  'id', 'vehicle_id', 'driver_id', 'trip_date', 'trip_reference',
  'route', 'client', 'amount', 'created_at', 'updated_at',
];

const COLUMNS_SQL = REVENUE_COLUMNS.join(', ');

// GET /api/revenue/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const entries = await query<RevenueEntry>(
      `SELECT ${COLUMNS_SQL} FROM revenue_entries WHERE vehicle_id = $1 ORDER BY trip_date DESC LIMIT $2`,
      [req.params.vehicleId, limit]
    );
    res.json(entries);
  })
);

// POST /api/revenue
router.post(
  '/',
  requireRole('admin', 'manager'),
  requireFields(['vehicleId', 'driverId', 'tripDate', 'tripReference', 'route', 'client', 'amount']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO revenue_entries (id, vehicle_id, driver_id, trip_date, trip_reference, route, client, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, b.vehicleId, b.driverId, b.tripDate, b.tripReference, b.route, b.client, b.amount]
    );
    const created = await queryOne<RevenueEntry>(`SELECT ${COLUMNS_SQL} FROM revenue_entries WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
