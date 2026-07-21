import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, queryOne, execute } from '../db';
import { requireFields, requireIdParam, asyncHandler } from '../validate';
import type { VehicleDocument } from '../types';
import { requireAuth, requireRole } from '../auth';
import { storageService, DOCUMENTS_BUCKET, PHOTOS_BUCKET } from '../storage/storage.service';

const router = Router();
router.use(requireAuth);

const ALLOWED_DOC_TYPES = [
  'purchase_invoice',
  'insurance_policy',
  'registration_certificate',
  'receipt',
  'report',
  'other',
];

const DOCUMENT_COLUMNS = [
  'id', 'vehicle_id', 'doc_type', 'file_name', 'issue_date',
  'expiry_date', 'notes', 'object_key', 'bucket', 'mime_type', 'file_size',
  'created_at', 'updated_at',
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

// GET /api/documents/:id/url
// Returns a short-lived signed URL to view/download the actual uploaded file.
// Kept as a separate endpoint (rather than a durable stored URL) because the
// documents bucket is private — every request gets a fresh, time-limited link.
router.get(
  '/:id/url',
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const doc = await queryOne<{ object_key: string | null; bucket: string | null; file_name: string }>(
      `SELECT object_key, bucket, file_name FROM vehicle_documents WHERE id = $1`,
      [req.params.id]
    );
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    if (!doc.object_key) {
      res.status(404).json({ error: 'This document has no uploaded file on record' });
      return;
    }
    const url = await storageService.presignDownload(doc.bucket || DOCUMENTS_BUCKET, doc.object_key, 300);
    res.json({ url, fileName: doc.file_name, expiresIn: 300 });
  })
);

// POST /api/documents
// Client uploads the file to MinIO first via POST /api/uploads/presign (kind:
// 'document'), then calls this endpoint with the resulting objectKey/bucket
// plus the document metadata.
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
      `INSERT INTO vehicle_documents (id, vehicle_id, doc_type, file_name, issue_date, expiry_date, notes, object_key, bucket, mime_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        b.vehicleId,
        b.docType,
        b.fileName,
        b.issueDate,
        b.expiryDate ?? null,
        b.notes ?? null,
        b.objectKey ?? null,
        b.bucket ?? null,
        b.mimeType ?? null,
        b.fileSize ?? null,
      ]
    );
    const created = await queryOne<VehicleDocument>(`SELECT ${COLUMNS_SQL} FROM vehicle_documents WHERE id = $1`, [id]);
    res.status(201).json(created);
  })
);

// DELETE /api/documents/:id — also removes the underlying file from storage
router.delete(
  '/:id',
  requireRole('admin', 'manager'),
  requireIdParam(),
  asyncHandler(async (req, res) => {
    const doc = await queryOne<{ object_key: string | null; bucket: string | null }>(
      `SELECT object_key, bucket FROM vehicle_documents WHERE id = $1`,
      [req.params.id]
    );
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    await execute(`DELETE FROM vehicle_documents WHERE id = $1`, [req.params.id]);
    if (doc.object_key) {
      // Best-effort — a dangling object in storage is a minor cleanup issue,
      // not worth failing the whole delete over if this call errors.
      storageService.deleteObject(doc.bucket || DOCUMENTS_BUCKET, doc.object_key).catch((err) => {
        console.error('Failed to delete document object from storage:', err.message);
      });
    }
    res.status(204).send();
  })
);

export default router;
