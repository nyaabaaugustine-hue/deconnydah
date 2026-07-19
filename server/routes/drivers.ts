import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { Driver } from '../types';

const router = Router();

// GET /api/drivers — list all drivers
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const drivers = await query<Driver>(`SELECT * FROM drivers ORDER BY full_name`);
    res.json(drivers);
  })
);

// GET /api/drivers/:id
router.get(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const driver = await queryOne<Driver>(`SELECT * FROM drivers WHERE id = $1`, [req.params.id]);
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
  requireFields(['fullName', 'phone', 'licenseNumber', 'hireDate']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO drivers (id, full_name, phone, license_number, supervisor_id, hire_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, b.fullName, b.phone, b.licenseNumber, b.supervisorId ?? null, b.hireDate, b.status ?? 'active']
    );
    const created = await queryOne<Driver>(`SELECT * FROM drivers WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

// PATCH /api/drivers/:id
router.patch(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const existing = await queryOne<Driver>(`SELECT * FROM drivers WHERE id = $1`, [req.params.id]);
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

    const updated = await queryOne<Driver>(`SELECT * FROM drivers WHERE id = $1`, [req.params.id]);
    res.json(updated);
  })
);

// DELETE /api/drivers/:id
router.delete(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const result = await execute(`DELETE FROM drivers WHERE id = $1`, [req.params.id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }
    res.status(204).send();
  })
);

export default router;
