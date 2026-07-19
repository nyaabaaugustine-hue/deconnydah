import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { TyreLog } from '../types';

const router = Router();

const ALLOWED_POSITIONS = ['FL', 'FR', 'RL', 'RR', 'SPARE'];

// GET /api/tyres/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const logs = await query<TyreLog>(
      `SELECT * FROM tyre_logs WHERE vehicle_id = $1 ORDER BY install_date DESC`,
      [req.params.vehicleId]
    );
    res.json(logs);
  })
);

// POST /api/tyres
router.post(
  '/',
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
    res.status(201).json({ id, ...b });
  })
);

export default router;
