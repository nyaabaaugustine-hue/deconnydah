import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const SETTING_COLUMNS = [
  'id', 'key', 'value', 'category', 'description',
  'updated_by', 'created_at', 'updated_at',
];

const COLUMNS_SQL = SETTING_COLUMNS.join(', ');

// GET /api/settings — list all settings grouped by category
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await query(`SELECT ${COLUMNS_SQL} FROM settings ORDER BY category, key`);
    res.json(rows);
  })
);

// GET /api/settings/:key — single setting
router.get(
  '/:key',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const row = await queryOne(`SELECT ${COLUMNS_SQL} FROM settings WHERE key = $1`, [req.params.key]);
    if (!row) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }
    res.json(row);
  })
);

// PUT /api/settings/:key — update setting value (admin only)
router.put(
  '/:key',
  requireRole('admin'),
  requireIdParam(),
  requireFields(['value']),
  asyncHandler(async (req, res) => {
    const updatedBy = (req as any).user?.id ?? null;
    const result = await execute(
      `UPDATE settings SET value = $1, updated_by = $2, updated_at = NOW() WHERE key = $3`,
      [req.body.value, updatedBy, req.params.key]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }
    const updated = await queryOne(`SELECT ${COLUMNS_SQL} FROM settings WHERE key = $1`, [req.params.key]);
    res.json(updated);
  })
);

// POST /api/settings — create setting (admin only)
router.post(
  '/',
  requireRole('admin'),
  requireFields(['key', 'value']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    const updatedBy = (req as any).user?.id ?? null;
    await execute(
      `INSERT INTO settings (id, key, value, category, description, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, b.key, b.value, b.category ?? null, b.description ?? null, updatedBy]
    );
    const created = await queryOne(`SELECT ${COLUMNS_SQL} FROM settings WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
