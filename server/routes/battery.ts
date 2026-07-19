import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { BatteryLog } from '../types';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// GET /api/battery/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const logs = await query<BatteryLog>(
      `SELECT * FROM battery_logs WHERE vehicle_id = $1 ORDER BY install_date DESC`,
      [req.params.vehicleId]
    );
    res.json(logs);
  })
);

// POST /api/battery
router.post(
  '/',
  requireFields(['vehicleId', 'installDate', 'brand', 'supplier', 'cost']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO battery_logs (id, vehicle_id, install_date, replacement_date, brand, supplier, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, b.vehicleId, b.installDate, b.replacementDate ?? null, b.brand, b.supplier, b.cost]
    );
    res.status(201).json({ id, ...b });
  })
);

export default router;
