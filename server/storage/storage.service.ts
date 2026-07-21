import { randomUUID } from 'crypto';
import { minioProvider } from './minio.provider';
import type { StorageProvider } from './storage.interface';

// ── Buckets ────────────────────────────────────────────────────────────────────
// Two buckets, two access models:
//  - MEDIA (photos, driver avatars): configured for public read in MinIO, so we
//    can store/return a plain URL exactly like the old Cloudinary flow did — no
//    downstream UI changes needed to *display* an image.
//  - DOCUMENTS (registration/insurance docs, receipts, reports): private. The
//    client never gets a durable URL; it gets a short-lived signed GET URL each
//    time it actually needs to view/download a specific file.
export const MEDIA_BUCKET = process.env.MINIO_MEDIA_BUCKET || 'fleet-media';
export const DOCUMENTS_BUCKET = process.env.MINIO_DOCUMENTS_BUCKET || 'fleet-documents';

export type UploadKind = 'photo' | 'avatar' | 'document';

const KIND_CONFIG: Record<UploadKind, { bucket: string; folder: string; allowedMimeTypes: string[]; maxSizeBytes: number }> = {
  photo: {
    bucket: MEDIA_BUCKET,
    folder: 'vehicle-photos',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  avatar: {
    bucket: MEDIA_BUCKET,
    folder: 'driver-avatars',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
  document: {
    bucket: DOCUMENTS_BUCKET,
    folder: 'documents',
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
  },
};

/** Strip anything that isn't safe in a URL path / S3 key from a filename. */
function sanitizeFileName(name: string): string {
  const trimmed = name.trim().slice(-180); // keep it short and avoid absurd keys
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function extensionOf(fileName: string): string {
  const match = /\.[a-zA-Z0-9]+$/.exec(fileName);
  return match ? match[0].toLowerCase() : '';
}

export interface PresignUploadRequest {
  kind: UploadKind;
  fileName: string;
  contentType: string;
  /** Declared size in bytes, if the client sent it — used for an early size check. */
  sizeBytes?: number;
}

export interface PresignUploadResult {
  uploadUrl: string;
  objectKey: string;
  bucket: string;
  expiresIn: number;
  /** Only present for public buckets (photo/avatar) — the durable URL to store in Postgres. */
  publicUrl?: string;
}

export class StorageValidationError extends Error {}

export class StorageService {
  constructor(private readonly provider: StorageProvider = minioProvider) {}

  async presignUpload(req: PresignUploadRequest): Promise<PresignUploadResult> {
    const config = KIND_CONFIG[req.kind];
    if (!config) {
      throw new StorageValidationError(`Unknown upload kind: ${req.kind}`);
    }
    if (!config.allowedMimeTypes.includes(req.contentType)) {
      throw new StorageValidationError(
        `File type "${req.contentType}" not allowed for ${req.kind} uploads. Allowed: ${config.allowedMimeTypes.join(', ')}`
      );
    }
    if (req.sizeBytes !== undefined && req.sizeBytes > config.maxSizeBytes) {
      throw new StorageValidationError(
        `File too large (${(req.sizeBytes / 1024 / 1024).toFixed(1)}MB). Max for ${req.kind}: ${config.maxSizeBytes / 1024 / 1024}MB`
      );
    }

    const safeName = sanitizeFileName(req.fileName || 'file');
    const ext = extensionOf(safeName);
    // UUID-based key so two people uploading "photo.jpg" at the same moment never
    // collide, and so the object key itself never leaks the original filename.
    const objectKey = `${config.folder}/${randomUUID()}${ext}`;

    const presigned = await this.provider.presignUpload(config.bucket, objectKey, req.contentType);

    return {
      uploadUrl: presigned.uploadUrl,
      objectKey,
      bucket: config.bucket,
      expiresIn: presigned.expiresIn,
      publicUrl: config.bucket === MEDIA_BUCKET ? this.provider.publicUrl(config.bucket, objectKey) : undefined,
    };
  }

  /** Short-lived signed GET URL for a private (document) object. */
  presignDownload(bucket: string, objectKey: string, expiresInSeconds = 300): Promise<string> {
    return this.provider.presignDownload(bucket, objectKey, expiresInSeconds);
  }

  deleteObject(bucket: string, objectKey: string): Promise<void> {
    return this.provider.deleteObject(bucket, objectKey);
  }

  objectExists(bucket: string, objectKey: string): Promise<boolean> {
    return this.provider.objectExists(bucket, objectKey);
  }
}

export const storageService = new StorageService();
