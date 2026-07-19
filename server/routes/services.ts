import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { ServiceLog } from '../types';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// GET /api/services/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const logs = await query<ServiceLog>(
      `SELECT * FROM service_logs WHERE vehicle_id = $1 ORDER BY service_date DESC`,
      [req.params.vehicleId]
    );
    res.json(logs);
  })
);

// POST /api/services
router.post(
  '/',
  requireFields(['vehicleId', 'serviceDate', 'mileageKm', 'serviceType', 'partsReplaced', 'workshop', 'cost']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO service_logs (id, vehicle_id, service_date, mileage_km, service_type, parts_replaced, workshop, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, b.vehicleId, b.serviceDate, b.mileageKm, b.serviceType, b.partsReplaced, b.workshop, b.cost]
    );
    res.status(201).json({ id, ...b });
  })
);

export default router;
