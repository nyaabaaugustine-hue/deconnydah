import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { Driver } from '../types';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const DRIVER_COLUMNS = [
  'id', 'full_name', 'phone', 'license_number', 'supervisor_id',
  'hire_date', 'status', 'photo_url', 'created_at', 'updated_at',
];

const COLUMNS_SQL = DRIVER_COLUMNS.join(', ');

// GET /api/drivers — list all drivers (with optional pagination)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const cursor = req.query.cursor as string | undefined;

    let sql: string;
    let params: any[];

    if (cursor) {
      sql = `SELECT ${COLUMNS_SQL} FROM drivers WHERE deleted_at IS NULL AND (full_name > (SELECT full_name FROM drivers WHERE id = $1) OR (full_name = (SELECT full_name FROM drivers WHERE id = $1) AND id > $1)) ORDER BY full_name, id LIMIT $2`;
      params = [cursor, limit + 1];
    } else {
      sql = `SELECT ${COLUMNS_SQL} FROM drivers WHERE deleted_at IS NULL ORDER BY full_name, id LIMIT $1`;
      params = [limit + 1];
    }

    const drivers = await query<Driver>(sql, params);
    const hasMore = drivers.length > limit;
    if (hasMore) drivers.pop();

    res.set({
      'X-Has-More': String(hasMore),
      ...(hasMore && drivers.length > 0 ? { 'X-Next-Cursor': drivers[drivers.length - 1].id } : {}),
    });
    res.json(drivers);
  })
);

// GET /api/drivers/:id
router.get(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const driver = await queryOne<Driver>(
      `SELECT ${COLUMNS_SQL} FROM drivers WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }
    res.json(driver);
  })
);

// POST /api/drivers — create driver
router.post(
  '/',
  requireRole('admin', 'manager'),
  requireFields(['fullName', 'phone', 'licenseNumber', 'hireDate']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO drivers (id, full_name, phone, license_number, supervisor_id, hire_date, status, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, b.fullName, b.phone, b.licenseNumber, b.supervisorId ?? null, b.hireDate, b.status ?? 'active', b.photoUrl ?? null]
    );
    const created = await queryOne<Driver>(`SELECT ${COLUMNS_SQL} FROM drivers WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

// PATCH /api/drivers/:id
router.patch(
  '/:id',
  requireRole('admin', 'manager'),
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const existing = await queryOne<Driver>(
      `SELECT ${COLUMNS_SQL} FROM drivers WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!existing) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    const columnMap: Record<string, string> = {
      fullName: 'full_name',
      phone: 'phone',
      licenseNumber: 'license_number',
      supervisorId: 'supervisor_id',
      hireDate: 'hire_date',
      status: 'status',
      photoUrl: 'photo_url',
    };

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, column] of Object.entries(columnMap)) {
      if (req.body[key] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(req.body[key]);
        paramIndex++;
      }
    }

    if (fields.length > 0) {
      values.push(req.params.id);
      await execute(`UPDATE drivers SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
    }

    const updated = await queryOne<Driver>(`SELECT ${COLUMNS_SQL} FROM drivers WHERE id = $1`, [req.params.id]);
    res.json(updated);
  })
);

// DELETE /api/drivers/:id — soft delete
router.delete(
  '/:id',
  requireRole('admin'),
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const result = await execute(
      `UPDATE drivers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }
    res.status(204).send();
  })
);

export default router;
