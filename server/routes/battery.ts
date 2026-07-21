import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { BatteryLog } from '../types';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const BATTERY_COLUMNS = [
  'id', 'vehicle_id', 'install_date', 'replacement_date',
  'brand', 'supplier', 'cost', 'created_at', 'updated_at',
];

const COLUMNS_SQL = BATTERY_COLUMNS.join(', ');

// GET /api/battery/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const logs = await query<BatteryLog>(
      `SELECT ${COLUMNS_SQL} FROM battery_logs WHERE vehicle_id = $1 ORDER BY install_date DESC LIMIT $2`,
      [req.params.vehicleId, limit]
    );
    res.json(logs);
  })
);

// POST /api/battery
router.post(
  '/',
  requireRole('admin', 'manager'),
  requireFields(['vehicleId', 'installDate', 'brand', 'supplier', 'cost']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO battery_logs (id, vehicle_id, install_date, replacement_date, brand, supplier, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, b.vehicleId, b.installDate, b.replacementDate ?? null, b.brand, b.supplier, b.cost]
    );
    const created = await queryOne<BatteryLog>(`SELECT ${COLUMNS_SQL} FROM battery_logs WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
