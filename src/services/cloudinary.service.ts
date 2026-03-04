import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { config } from '../config';
import { logger } from '../utils/logger.util';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

export class CloudinaryService {
  async uploadImage(
    file: Buffer | string,
    options: {
      folder?: string;
      publicId?: string;
      transformation?: any;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
    } = {}
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: options.folder || 'hosthaven',
        public_id: options.publicId,
        resource_type: options.resourceType || 'image',
        transformation: options.transformation || [
          { quality: 'auto:good', fetch_format: 'auto' },
        ],
      };

      const uploadCallback = (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) {
          logger.error({ error }, 'Cloudinary upload failed');
          reject(new Error(error.message));
        } else if (result) {
          logger.info({ publicId: result.public_id }, 'Image uploaded to Cloudinary');
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          });
        }
      };

      if (typeof file === 'string' && file.startsWith('data:')) {
        cloudinary.uploader.upload(file, uploadOptions, uploadCallback);
      } else if (Buffer.isBuffer(file)) {
        cloudinary.uploader.upload_stream(uploadOptions, uploadCallback).end(file);
      } else {
        cloudinary.uploader.upload(file, uploadOptions, uploadCallback);
      }
    });
  }

  async uploadMultiple(
    files: Buffer[] | string[],
    options: {
      folder?: string;
      transformation?: any;
    } = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) =>
      this.uploadImage(file, { folder: options.folder, transformation: options.transformation })
    );
    return Promise.all(uploadPromises);
  }

  async deleteImage(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          logger.error({ error, publicId }, 'Cloudinary delete failed');
          reject(new Error(error.message));
        } else {
          logger.info({ publicId, result }, 'Image deleted from Cloudinary');
          resolve();
        }
      });
    });
  }

  async deleteMultiple(publicIds: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.api.delete_resources(publicIds, (error, result) => {
        if (error) {
          logger.error({ error }, 'Cloudinary bulk delete failed');
          reject(new Error(error.message));
        } else {
          logger.info({ deleted: result.deleted }, 'Images deleted from Cloudinary');
          resolve();
        }
      });
    });
  }

  getOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: options.width,
          height: options.height,
          crop: options.crop || 'fill',
          quality: options.quality || 'auto:good',
          fetch_format: options.format || 'auto',
        },
      ],
    });
  }

  getThumbnailUrl(publicId: string, size: number = 200): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: size,
          height: size,
          crop: 'thumb',
          gravity: 'auto',
          quality: 'auto:good',
          fetch_format: 'auto',
        },
      ],
    });
  }
}

export const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
