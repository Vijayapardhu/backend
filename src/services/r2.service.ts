import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from '../utils/logger.util';

// Initialize S3 client for Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

export interface UploadResult {
  url: string;
  key: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

export class R2StorageService {
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    this.bucketName = config.r2.bucketName;
    this.publicUrl = config.r2.publicUrl;
  }

  /**
   * Upload a file to R2
   */
  async upload(
    file: Buffer,
    options: {
      folder?: string;
      filename?: string;
      contentType?: string;
    } = {}
  ): Promise<UploadResult> {
    const folder = options.folder || 'hosthaven';
    const filename = options.filename || `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const key = `${folder}/${filename}`;
    const contentType = options.contentType || 'application/octet-stream';

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      });

      await r2Client.send(command);

      const url = `${this.publicUrl}/${key}`;
      
      logger.info({ key, bucket: this.bucketName }, 'File uploaded to R2');

      return {
        url,
        key,
        format: contentType.split('/')[1] || 'unknown',
        bytes: file.length,
      };
    } catch (error) {
      logger.error({ error, key }, 'R2 upload failed');
      throw new Error('Failed to upload file to R2');
    }
  }

  /**
   * Upload multiple files to R2
   */
  async uploadMultiple(
    files: Buffer[],
    options: {
      folder?: string;
      filenames?: string[];
      contentTypes?: string[];
    } = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file, index) => {
      return this.upload(file, {
        folder: options.folder,
        filename: options.filenames?.[index],
        contentType: options.contentTypes?.[index],
      });
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await r2Client.send(command);
      logger.info({ key }, 'File deleted from R2');
    } catch (error) {
      logger.error({ error, key }, 'R2 delete failed');
      throw new Error('Failed to delete file from R2');
    }
  }

  /**
   * Delete multiple files from R2
   */
  async deleteMultiple(keys: string[]): Promise<void> {
    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
          Quiet: true,
        },
      });

      await r2Client.send(command);
      logger.info({ keys }, 'Files deleted from R2');
    } catch (error) {
      logger.error({ error, keys }, 'R2 bulk delete failed');
      throw new Error('Failed to delete files from R2');
    }
  }

  /**
   * Get a signed URL for private files (valid for 1 hour by default)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      logger.error({ error, key }, 'R2 signed URL generation failed');
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Generate a unique key for file storage
   */
  generateKey(folder: string, originalFilename: string): string {
    const ext = originalFilename.split('.').pop() || '';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return `${folder}/${uniqueName}.${ext}`;
  }
}

export const r2StorageService = new R2StorageService();
export default r2StorageService;
