import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { Valuation } from '../types';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const VALUATION_COLUMNS = [
  'id', 'vehicle_id', 'valuation_date', 'source', 'amount',
  'condition_notes', 'created_at', 'updated_at',
];

const COLUMNS_SQL = VALUATION_COLUMNS.join(', ');

// GET /api/valuations/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const valuations = await query<Valuation>(
      `SELECT ${COLUMNS_SQL} FROM valuations WHERE vehicle_id = $1 ORDER BY valuation_date DESC LIMIT $2`,
      [req.params.vehicleId, limit]
    );
    res.json(valuations);
  })
);

// POST /api/valuations
router.post(
  '/',
  requireRole('admin', 'manager'),
  requireFields(['vehicleId', 'valuationDate', 'source', 'amount', 'conditionNotes']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO valuations (id, vehicle_id, valuation_date, source, amount, condition_notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, b.vehicleId, b.valuationDate, b.source, b.amount, b.conditionNotes]
    );
    const created = await queryOne<Valuation>(`SELECT ${COLUMNS_SQL} FROM valuations WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
