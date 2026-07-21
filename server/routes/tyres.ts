import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { TyreLog } from '../types';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const ALLOWED_POSITIONS = ['FL', 'FR', 'RL', 'RR', 'SPARE'];

const TYRE_COLUMNS = [
  'id', 'vehicle_id', 'position', 'install_date', 'replacement_date',
  'brand', 'cost', 'created_at', 'updated_at',
];

const COLUMNS_SQL = TYRE_COLUMNS.join(', ');

// GET /api/tyres/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const logs = await query<TyreLog>(
      `SELECT ${COLUMNS_SQL} FROM tyre_logs WHERE vehicle_id = $1 ORDER BY install_date DESC LIMIT $2`,
      [req.params.vehicleId, limit]
    );
    res.json(logs);
  })
);

// POST /api/tyres
router.post(
  '/',
  requireRole('admin', 'manager'),
  requireFields(['vehicleId', 'position', 'installDate', 'brand', 'cost']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    if (!ALLOWED_POSITIONS.includes(b.position)) {
      res.status(400).json({ error: `position must be one of: ${ALLOWED_POSITIONS.join(', ')}` });
      return;
    }
    const id = randomUUID();
    await execute(
      `INSERT INTO tyre_logs (id, vehicle_id, position, install_date, replacement_date, brand, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, b.vehicleId, b.position, b.installDate, b.replacementDate ?? null, b.brand, b.cost]
    );
    const created = await queryOne<TyreLog>(`SELECT ${COLUMNS_SQL} FROM tyre_logs WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
