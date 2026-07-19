import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { VehiclePhoto } from '../types';

const router = Router();

// GET /api/photos/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const photos = await query<VehiclePhoto>(
      `SELECT * FROM vehicle_photos WHERE vehicle_id = $1 ORDER BY taken_at DESC`,
      [req.params.vehicleId]
    );
    res.json(photos);
  })
);

// POST /api/photos
// NOTE: expects the client to have already uploaded the binary to Cloudinary and to send back
// the resulting URL as `caption`/metadata here. This endpoint stores metadata only — see
// production-readiness-plan.md Phase 2 for wiring the actual upload flow.
router.post(
  '/',
  requireFields(['vehicleId', 'category', 'caption', 'takenAt']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO vehicle_photos (id, vehicle_id, category, caption, taken_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, b.vehicleId, b.category, b.caption, b.takenAt]
    );
    res.status(201).json({ id, ...b });
  })
);

export default router;
