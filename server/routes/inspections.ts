import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';

const router = Router();

const ALLOWED_STATUSES = ['pass', 'fail', 'flagged'];

// GET /api/inspections — list all
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await query(`SELECT * FROM inspections ORDER BY inspection_date DESC`);
    res.json(rows);
  })
);

// GET /api/inspections/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT * FROM inspections WHERE vehicle_id = $1 ORDER BY inspection_date DESC`,
      [req.params.vehicleId]
    );
    res.json(rows);
  })
);

// GET /api/inspections/:id
router.get(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const row = await queryOne(`SELECT * FROM inspections WHERE id = $1`, [req.params.id]);
    if (!row) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }
    res.json(row);
  })
);

// POST /api/inspections
router.post(
  '/',
  requireFields(['vehicleId', 'driverName', 'inspectionDate', 'overallStatus', 'checklist']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    if (!ALLOWED_STATUSES.includes(b.overallStatus)) {
      res.status(400).json({ error: `overallStatus must be one of: ${ALLOWED_STATUSES.join(', ')}` });
      return;
    }
    const id = randomUUID();
    await execute(
      `INSERT INTO inspections (id, vehicle_id, driver_name, inspection_date, overall_status, checklist, notes, photo_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        b.vehicleId,
        b.driverName,
        b.inspectionDate,
        b.overallStatus,
        JSON.stringify(b.checklist),
        b.notes ?? '',
        b.photoCount ?? 0,
      ]
    );
    const created = await queryOne(`SELECT * FROM inspections WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
