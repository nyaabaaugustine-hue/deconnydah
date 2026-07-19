import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { Valuation } from '../types';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// GET /api/valuations/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const valuations = await query<Valuation>(
      `SELECT * FROM valuations WHERE vehicle_id = $1 ORDER BY valuation_date DESC`,
      [req.params.vehicleId]
    );
    res.json(valuations);
  })
);

// POST /api/valuations
router.post(
  '/',
  requireFields(['vehicleId', 'valuationDate', 'source', 'amount', 'conditionNotes']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO valuations (id, vehicle_id, valuation_date, source, amount, condition_notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, b.vehicleId, b.valuationDate, b.source, b.amount, b.conditionNotes]
    );
    res.status(201).json({ id, ...b });
  })
);

export default router;
