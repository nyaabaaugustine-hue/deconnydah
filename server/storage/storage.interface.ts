// Storage abstraction — business logic (routes) should depend only on this
// interface, never directly on the MinIO/S3 SDK. That keeps the door open to
// swapping providers later (AWS S3, Cloudflare R2, Backblaze B2 all speak the
// same S3 API, so in practice only env vars would need to change) without
// touching a single route file.

export interface PresignedUpload {
  /** Time-limited URL the browser PUTs the raw file bytes to directly. */
  uploadUrl: string;
  /** The key (path) the object will live at once uploaded — store this in Postgres. */
  objectKey: string;
  /** Which bucket the object was written to — store this in Postgres. */
  bucket: string;
  /** Seconds until `uploadUrl` expires. */
  expiresIn: number;
}

export interface StorageProvider {
  /**
   * Generate a presigned PUT URL so the browser can upload a file's bytes
   * directly to the bucket, without the file ever passing through our server.
   */
  presignUpload(bucket: string, objectKey: string, contentType: string, expiresInSeconds?: number): Promise<PresignedUpload>;

  /**
   * Generate a presigned GET URL for a private object (e.g. a document/receipt).
   * Short-lived by design — callers should fetch a fresh one each time a file
   * is opened rather than caching it.
   */
  presignDownload(bucket: string, objectKey: string, expiresInSeconds?: number): Promise<string>;

  /** Direct, non-expiring URL for objects in a bucket configured for public read (e.g. photos/avatars). */
  publicUrl(bucket: string, objectKey: string): string;

  /** Permanently remove an object (e.g. when a photo/document row is deleted). */
  deleteObject(bucket: string, objectKey: string): Promise<void>;

  /** Confirm an object exists in the bucket (e.g. before generating a download link). */
  objectExists(bucket: string, objectKey: string): Promise<boolean>;
}
