import { Router } from 'express';
import { asyncHandler } from '../validate';
import { requireAuth } from '../auth';
import { storageService, StorageValidationError, type UploadKind } from '../storage/storage.service';

const router = Router();
router.use(requireAuth);

const VALID_KINDS: UploadKind[] = ['photo', 'avatar', 'document'];

/**
 * POST /api/uploads/presign
 *
 * Two-step upload pattern (same shape the app used with Cloudinary, now backed
 * by MinIO): the server never sees the file's bytes. It validates the request
 * and hands back a short-lived presigned URL; the browser then PUTs the raw
 * file directly to that URL. Once that succeeds, the client calls the normal
 * POST /api/photos, /api/documents, or PATCH /api/drivers/:id endpoint with
 * the returned objectKey/bucket (and publicUrl, for photos/avatars) to save
 * the metadata row.
 *
 * body: { kind: 'photo' | 'avatar' | 'document', fileName: string, contentType: string, sizeBytes?: number }
 */
router.post(
  '/presign',
  asyncHandler(async (req, res) => {
    const { kind, fileName, contentType, sizeBytes } = req.body ?? {};

    if (!VALID_KINDS.includes(kind)) {
      res.status(400).json({ error: `kind must be one of: ${VALID_KINDS.join(', ')}` });
      return;
    }
    if (!fileName || typeof fileName !== 'string') {
      res.status(400).json({ error: 'fileName is required' });
      return;
    }
    if (!contentType || typeof contentType !== 'string') {
      res.status(400).json({ error: 'contentType is required' });
      return;
    }

    try {
      const result = await storageService.presignUpload({
        kind,
        fileName,
        contentType,
        sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : undefined,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof StorageValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  })
);

export default router;
