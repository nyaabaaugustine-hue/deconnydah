import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const ALLOWED_STATUSES = ['pass', 'fail', 'flagged'];

const INSPECTION_COLUMNS = [
  'id', 'vehicle_id', 'driver_name', 'inspection_date', 'overall_status',
  'checklist', 'notes', 'photo_count', 'created_at', 'updated_at',
];

const COLUMNS_SQL = INSPECTION_COLUMNS.join(', ');

// GET /api/inspections — list all (with optional pagination)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const cursor = req.query.cursor as string | undefined;

    let sql: string;
    let params: any[];

    if (cursor) {
      sql = `SELECT ${COLUMNS_SQL} FROM inspections WHERE (inspection_date < (SELECT inspection_date FROM inspections WHERE id = $1) OR (inspection_date = (SELECT inspection_date FROM inspections WHERE id = $1) AND id < $1)) ORDER BY inspection_date DESC, id DESC LIMIT $2`;
      params = [cursor, limit + 1];
    } else {
      sql = `SELECT ${COLUMNS_SQL} FROM inspections ORDER BY inspection_date DESC, id DESC LIMIT $1`;
      params = [limit + 1];
    }

    const rows = await query(sql, params);
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    res.set({
      'X-Has-More': String(hasMore),
      ...(hasMore && rows.length > 0 ? { 'X-Next-Cursor': rows[rows.length - 1].id } : {}),
    });
    res.json(rows);
  })
);

// GET /api/inspections/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const rows = await query(
      `SELECT ${COLUMNS_SQL} FROM inspections WHERE vehicle_id = $1 ORDER BY inspection_date DESC LIMIT $2`,
      [req.params.vehicleId, limit]
    );
    res.json(rows);
  })
);

// GET /api/inspections/:id
router.get(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const row = await queryOne(
      `SELECT ${COLUMNS_SQL} FROM inspections WHERE id = $1`,
      [req.params.id]
    );
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
  requireRole('admin', 'manager'),
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
    const created = await queryOne(`SELECT ${COLUMNS_SQL} FROM inspections WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
