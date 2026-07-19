import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { VehicleDocument } from '../types';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

const ALLOWED_DOC_TYPES = ['purchase_invoice', 'insurance_policy', 'registration_certificate'];

// GET /api/documents/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const docs = await query<VehicleDocument>(
      `SELECT * FROM vehicle_documents WHERE vehicle_id = $1 ORDER BY issue_date DESC`,
      [req.params.vehicleId]
    );
    res.json(docs);
  })
);

// POST /api/documents
router.post(
  '/',
  requireFields(['vehicleId', 'docType', 'fileName', 'issueDate']),
  asyncHandler(async (req, res) => {
    const b = req.body;
    if (!ALLOWED_DOC_TYPES.includes(b.docType)) {
      res.status(400).json({ error: `docType must be one of: ${ALLOWED_DOC_TYPES.join(', ')}` });
      return;
    }
    const id = randomUUID();
    await execute(
      `INSERT INTO vehicle_documents (id, vehicle_id, doc_type, file_name, issue_date, expiry_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, b.vehicleId, b.docType, b.fileName, b.issueDate, b.expiryDate ?? null, b.notes ?? null]
    );
    res.status(201).json({ id, ...b });
  })
);

export default router;
