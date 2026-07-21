import type { PresignedUpload } from './storage.interface';
export declare const DOCUMENTS_BUCKET = "fleet-documents";
export declare const PHOTOS_BUCKET = "fleet-media";
export type UploadKind = 'photo' | 'avatar' | 'document';
export declare class StorageValidationError extends Error {
    constructor(message: string);
}
interface PresignUploadOpts {
    kind: UploadKind;
    fileName: string;
    contentType: string;
    sizeBytes?: number;
}
declare class StorageService {
    private provider;
    /**
     * Validate inputs and hand back a presigned PUT URL so the browser can
     * upload directly to MinIO without the file bytes touching our server.
     */
    presignUpload(opts: PresignUploadOpts): Promise<PresignedUpload & {
        publicUrl?: string;
    }>;
    presignDownload(bucket: string, objectKey: string, expiresIn?: number): Promise<string>;
    publicUrl(bucket: string, objectKey: string): string;
    deleteObject(bucket: string, objectKey: string): Promise<void>;
    objectExists(bucket: string, objectKey: string): Promise<boolean>;
}
export declare const storageService: StorageService;
export {};
