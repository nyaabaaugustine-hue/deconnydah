import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { Vehicle } from '../types';

const router = Router();

const ALLOWED_STATUSES = ['active', 'in_repair', 'decommissioned', 'sold'];

// GET /api/vehicles — list all vehicles
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const vehicles = await query<Vehicle>(`SELECT * FROM vehicles ORDER BY created_at DESC`);
    res.json(vehicles);
  })
);

// GET /api/vehicles/:id — single vehicle
router.get(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const vehicle = await queryOne<Vehicle>(`SELECT * FROM vehicles WHERE id = $1`, [req.params.id]);
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    res.json(vehicle);
  })
);

// POST /api/vehicles — create vehicle
router.post(
  '/',
  requireFields(['plateNumber', 'make', 'model', 'year', 'vin', 'purchaseDate', 'purchasePrice']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    if (b.status && !ALLOWED_STATUSES.includes(b.status)) {
      res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
      return;
    }

    const id = randomUUID();
    await execute(
      `INSERT INTO vehicles (id, plate_number, make, model, year, vin, purchase_date, purchase_price, status, current_driver_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        b.plateNumber,
        b.make,
        b.model,
        b.year,
        b.vin,
        b.purchaseDate,
        b.purchasePrice,
        b.status ?? 'active',
        b.currentDriverId ?? null,
      ]
    );

    const created = await queryOne<Vehicle>(`SELECT * FROM vehicles WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

// PATCH /api/vehicles/:id — partial update
router.patch(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const existing = await queryOne<Vehicle>(`SELECT * FROM vehicles WHERE id = $1`, [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    if (req.body.status && !ALLOWED_STATUSES.includes(req.body.status)) {
      res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
      return;
    }

    const columnMap: Record<string, string> = {
      plateNumber: 'plate_number',
      make: 'make',
      model: 'model',
      year: 'year',
      vin: 'vin',
      purchaseDate: 'purchase_date',
      purchasePrice: 'purchase_price',
      status: 'status',
      currentDriverId: 'current_driver_id',
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
      await execute(`UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
    }

    const updated = await queryOne<Vehicle>(`SELECT * FROM vehicles WHERE id = $1`, [req.params.id]);
    res.json(updated);
  })
);

// DELETE /api/vehicles/:id
router.delete(
  '/:id',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const result = await execute(`DELETE FROM vehicles WHERE id = $1`, [req.params.id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    res.status(204).send();
  })
);

export default router;
