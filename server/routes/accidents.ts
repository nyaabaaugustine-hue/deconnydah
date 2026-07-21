import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { AccidentReport } from '../types';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const ACCIDENT_COLUMNS = [
  'id', 'vehicle_id', 'driver_id', 'accident_date', 'description',
  'cost', 'driver_at_fault', 'created_at', 'updated_at',
];

const COLUMNS_SQL = ACCIDENT_COLUMNS.join(', ');

// GET /api/accidents/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const reports = await query<AccidentReport>(
      `SELECT ${COLUMNS_SQL} FROM accident_reports WHERE vehicle_id = $1 ORDER BY accident_date DESC LIMIT $2`,
      [req.params.vehicleId, limit]
    );
    res.json(reports);
  })
);

// POST /api/accidents
router.post(
  '/',
  requireRole('admin', 'manager'),
  requireFields(['vehicleId', 'accidentDate', 'description', 'cost', 'driverAtFault']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO accident_reports (id, vehicle_id, driver_id, accident_date, description, cost, driver_at_fault)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, b.vehicleId, b.driverId ?? null, b.accidentDate, b.description, b.cost, b.driverAtFault]
    );
    const created = await queryOne<AccidentReport>(`SELECT ${COLUMNS_SQL} FROM accident_reports WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
