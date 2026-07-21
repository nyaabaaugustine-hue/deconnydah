import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { VehicleDocument } from '../types';
import { requireAuth, requireRole } from '../auth';

const router = Router();
router.use(requireAuth);

const ALLOWED_DOC_TYPES = ['purchase_invoice', 'insurance_policy', 'registration_certificate'];

const DOCUMENT_COLUMNS = [
  'id', 'vehicle_id', 'doc_type', 'file_name', 'issue_date',
  'expiry_date', 'notes', 'created_at', 'updated_at',
];

const COLUMNS_SQL = DOCUMENT_COLUMNS.join(', ');

// GET /api/documents/vehicle/:vehicleId
router.get(
  '/vehicle/:vehicleId',
  requireIdParam('vehicleId'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 200, 1), 1000);
    const docs = await query<VehicleDocument>(
      `SELECT ${COLUMNS_SQL} FROM vehicle_documents WHERE vehicle_id = $1 ORDER BY issue_date DESC LIMIT $2`,
      [req.params.vehicleId, limit]
    );
    res.json(docs);
  })
);

// POST /api/documents
router.post(
  '/',
  requireRole('admin', 'manager'),
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
    const created = await queryOne<VehicleDocument>(`SELECT ${COLUMNS_SQL} FROM vehicle_documents WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

export default router;
