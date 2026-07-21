import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { VehiclePhoto } from '../types';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const PHOTO_COLUMNS = [
  'id', 'vehicle_id', 'category', 'caption', 'taken_at',
  'image_url', 'created_at', 'updated_at',
];

const COLUMNS_SQL = PHOTO_COLUMNS.join(', ');

// GET /api/photos/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const photos = await query<VehiclePhoto>(
      `SELECT ${COLUMNS_SQL} FROM vehicle_photos WHERE vehicle_id = $1 ORDER BY taken_at DESC LIMIT $2`,
      [req.params.vehicleId, limit]
    );
    res.json(photos);
  })
);

// POST /api/photos
// The client uploads the binary directly to Cloudinary (via the signed params from
// POST /api/uploads/cloudinary-signature) and then sends the resulting secure_url here
// as `imageUrl`, which this endpoint stores alongside the category/caption/date metadata.
router.post(
  '/',
  requireRole('admin', 'manager'),
  requireFields(['vehicleId', 'category', 'caption', 'takenAt', 'imageUrl']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO vehicle_photos (id, vehicle_id, category, caption, taken_at, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, b.vehicleId, b.category, b.caption, b.takenAt, b.imageUrl]
    );
    const created = await queryOne<VehiclePhoto>(`SELECT ${COLUMNS_SQL} FROM vehicle_photos WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
