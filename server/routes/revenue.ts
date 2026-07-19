import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { RevenueEntry } from '../types';

const router = Router();

// GET /api/revenue/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const entries = await query<RevenueEntry>(
      `SELECT * FROM revenue_entries WHERE vehicle_id = $1 ORDER BY trip_date DESC`,
      [req.params.vehicleId]
    );
    res.json(entries);
  })
);

// POST /api/revenue
router.post(
  '/',
  requireFields(['vehicleId', 'driverId', 'tripDate', 'tripReference', 'route', 'client', 'amount']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO revenue_entries (id, vehicle_id, driver_id, trip_date, trip_reference, route, client, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, b.vehicleId, b.driverId, b.tripDate, b.tripReference, b.route, b.client, b.amount]
    );
    res.status(201).json({ id, ...b });
  })
);

export default router;
