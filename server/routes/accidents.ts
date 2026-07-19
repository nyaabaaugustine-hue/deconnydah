import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { AccidentReport } from '../types';

const router = Router();

// GET /api/accidents/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const reports = await query<AccidentReport>(
      `SELECT * FROM accident_reports WHERE vehicle_id = $1 ORDER BY accident_date DESC`,
      [req.params.vehicleId]
    );
    res.json(reports);
  })
);

// POST /api/accidents
router.post(
  '/',
  requireFields(['vehicleId', 'accidentDate', 'description', 'cost', 'driverAtFault']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO accident_reports (id, vehicle_id, driver_id, accident_date, description, cost, driver_at_fault)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, b.vehicleId, b.driverId ?? null, b.accidentDate, b.description, b.cost, b.driverAtFault]
    );
    res.status(201).json({ id, ...b });
  })
);

export default router;
