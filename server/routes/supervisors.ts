import { Router } from 'express';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { Supervisor } from '../types';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/supervisors — list all
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await query<Supervisor>(`SELECT * FROM supervisors ORDER BY full_name`);
    res.json(rows);
  })
);

// GET /api/supervisors/:id
router.get(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const row = await queryOne<Supervisor>(`SELECT * FROM supervisors WHERE id = $1`, [req.params.id]);
    if (!row) {
      res.status(404).json({ error: 'Supervisor not found' });
      return;
    }
    res.json(row);
  })
);

// POST /api/supervisors
router.post(
  '/',
  requireFields(['fullName', 'phone', 'region']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO supervisors (id, full_name, phone, region) VALUES ($1, $2, $3, $4)`,
      [id, b.fullName, b.phone, b.region]
    );
    const created = await queryOne<Supervisor>(`SELECT * FROM supervisors WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

// PATCH /api/supervisors/:id
router.patch(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const existing = await queryOne<Supervisor>(`SELECT * FROM supervisors WHERE id = $1`, [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'Supervisor not found' });
      return;
    }

    const columnMap: Record<string, string> = {
      fullName: 'full_name',
      phone: 'phone',
      region: 'region',
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
      await execute(`UPDATE supervisors SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
    }

    const updated = await queryOne<Supervisor>(`SELECT * FROM supervisors WHERE id = $1`, [req.params.id]);
    res.json(updated);
  })
);

// DELETE /api/supervisors/:id
router.delete(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const result = await execute(`DELETE FROM supervisors WHERE id = $1`, [req.params.id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Supervisor not found' });
      return;
    }
    res.status(204).send();
  })
);

export default router;
