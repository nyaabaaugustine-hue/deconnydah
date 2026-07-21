import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { ServiceLog } from '../types';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const SERVICE_COLUMNS = [
  'id', 'vehicle_id', 'service_date', 'mileage_km', 'service_type',
  'parts_replaced', 'workshop', 'cost', 'created_at', 'updated_at',
];

const COLUMNS_SQL = SERVICE_COLUMNS.join(', ');

// GET /api/services/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const logs = await query<ServiceLog>(
      `SELECT ${COLUMNS_SQL} FROM service_logs WHERE vehicle_id = $1 ORDER BY service_date DESC LIMIT $2`,
      [req.params.vehicleId, limit]
    );
    res.json(logs);
  })
);

// POST /api/services
router.post(
  '/',
  requireRole('admin', 'manager'),
  requireFields(['vehicleId', 'serviceDate', 'mileageKm', 'serviceType', 'partsReplaced', 'workshop', 'cost']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const id = randomUUID();
    await execute(
      `INSERT INTO service_logs (id, vehicle_id, service_date, mileage_km, service_type, parts_replaced, workshop, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, b.vehicleId, b.serviceDate, b.mileageKm, b.serviceType, b.partsReplaced, b.workshop, b.cost]
    );
    const created = await queryOne<ServiceLog>(`SELECT ${COLUMNS_SQL} FROM service_logs WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
