import { randomUUID } from 'crypto';
import { minioProvider } from './minio.provider';
export const DOCUMENTS_BUCKET = 'fleet-documents';
export const PHOTOS_BUCKET = 'fleet-media';
export class StorageValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StorageValidationError';
    }
}
const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);
const ALLOWED_DOC_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
]);
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DOC_SIZE = 25 * 1024 * 1024; // 25 MB
class StorageService {
    provider = minioProvider;
    /**
     * Validate inputs and hand back a presigned PUT URL so the browser can
     * upload directly to MinIO without the file bytes touching our server.
     */
    async presignUpload(opts) {
        const { kind, fileName, contentType, sizeBytes } = opts;
        // ── content-type validation ───────────────────────────────────────────
        if (kind === 'photo' || kind === 'avatar') {
            if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
                throw new StorageValidationError(`Invalid image type "${contentType}". Allowed: ${[...ALLOWED_IMAGE_TYPES].join(', ')}`);
            }
            if (sizeBytes != null && sizeBytes > MAX_PHOTO_SIZE) {
                throw new StorageValidationError(`Image exceeds ${MAX_PHOTO_SIZE / 1024 / 1024} MB limit`);
            }
        }
        else if (kind === 'document') {
            if (!ALLOWED_DOC_TYPES.has(contentType)) {
                throw new StorageValidationError(`Invalid document type "${contentType}". Allowed: ${[...ALLOWED_DOC_TYPES].join(', ')}`);
            }
            if (sizeBytes != null && sizeBytes > MAX_DOC_SIZE) {
                throw new StorageValidationError(`Document exceeds ${MAX_DOC_SIZE / 1024 / 1024} MB limit`);
            }
        }
        // ── object key ────────────────────────────────────────────────────────
        const ext = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
        const objectKey = `${kind}/${randomUUID()}.${ext}`;
        const bucket = kind === 'document' ? DOCUMENTS_BUCKET : PHOTOS_BUCKET;
        const presigned = await this.provider.presignUpload(bucket, objectKey, contentType);
        // For photos / avatars the bucket is public-read, so we also return a
        // ready-to-use public URL that can be stored in the DB and served
        // directly by the browser / CDN without signing.
        const result = { ...presigned };
        if (kind === 'photo' || kind === 'avatar') {
            result.publicUrl = this.provider.publicUrl(bucket, objectKey);
        }
        return result;
    }
    async presignDownload(bucket, objectKey, expiresIn = 300) {
        return this.provider.presignDownload(bucket, objectKey, expiresIn);
    }
    publicUrl(bucket, objectKey) {
        return this.provider.publicUrl(bucket, objectKey);
    }
    async deleteObject(bucket, objectKey) {
        return this.provider.deleteObject(bucket, objectKey);
    }
    async objectExists(bucket, objectKey) {
        return this.provider.objectExists(bucket, objectKey);
    }
}
export const storageService = new StorageService();
