import { FastifyRequest, FastifyReply } from "fastify";
import { cloudinaryService } from "../../services/cloudinary.service";
import { r2StorageService } from "../../services/r2.service";
import { config } from "../../config";
import { sendSuccess, sendError } from "../../utils/response.util";
import { ERROR_CODES } from "../../constants/error-codes";
import { logger } from "../../utils/logger.util";

const useR2 = (): boolean => {
  // R2 is disabled - using Cloudinary instead
  return false;
};

export const UploadsController = {
  async uploadSingle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "No file provided",
          400,
        );
      }

      const query = request.query as { folder?: string; resourceType?: string };
      const folder = query.folder || "hosthaven";

      const fileBuffer = await data.toBuffer();

      if (useR2()) {
        const contentType = data.mimetype || "application/octet-stream";
        const result = await r2StorageService.upload(fileBuffer, {
          folder,
          filename: data.filename,
          contentType,
        });

        return sendSuccess(
          reply,
          {
            url: result.url,
            key: result.key,
            format: result.format,
            bytes: result.bytes,
          },
          201,
        );
      } else {
        const resourceType = query.resourceType || "image";
        const result = await cloudinaryService.uploadImage(fileBuffer, {
          folder,
          resourceType: resourceType as any,
        });

        return sendSuccess(
          reply,
          {
            url: result.url,
            publicId: result.publicId,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          },
          201,
        );
      }
    } catch (error: any) {
      logger.error({ error }, "Upload failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to upload file",
        500,
      );
    }
  },

  async uploadMultiple(request: FastifyRequest, reply: FastifyReply) {
    try {
      const files = await request.files();

      const fileArray: any[] = [];
      for await (const file of files) {
        fileArray.push({
          filename: file.filename,
          mimetype: file.mimetype,
          data: await file.toBuffer(),
        });
      }

      if (fileArray.length === 0) {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "No files provided",
          400,
        );
      }

      const query = request.query as { folder?: string; resourceType?: string };
      const folder = query.folder || "hosthaven";

      if (useR2()) {
        const contentTypes = fileArray.map(
          (f) => f.mimetype || "application/octet-stream",
        );
        const filenames = fileArray.map((f) => f.filename);

        const results = await r2StorageService.uploadMultiple(
          fileArray.map((f) => f.data),
          {
            folder,
            filenames,
            contentTypes,
          },
        );

        const formattedResults = results.map((result) => ({
          url: result.url,
          key: result.key,
          format: result.format,
          bytes: result.bytes,
        }));

        return sendSuccess(reply, formattedResults, 201);
      } else {
        const resourceType = query.resourceType || "image";

        const uploadPromises = fileArray.map(async (file) => {
          const result = await cloudinaryService.uploadImage(file.data, {
            folder,
            resourceType: resourceType as any,
          });
          return {
            url: result.url,
            publicId: result.publicId,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          };
        });

        const results = await Promise.all(uploadPromises);

        return sendSuccess(reply, results, 201);
      }
    } catch (error: any) {
      logger.error({ error }, "Multiple upload failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to upload files",
        500,
      );
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as { publicId?: string; key?: string };
      const publicId = body.publicId;
      const key = body.key;

      if (!publicId && !key) {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "publicId or key is required",
          400,
        );
      }

      if (useR2() && key) {
        await r2StorageService.delete(key);
      } else if (publicId) {
        await cloudinaryService.deleteImage(publicId);
      }

      return sendSuccess(reply, { message: "File deleted successfully" });
    } catch (error: any) {
      logger.error({ error }, "Delete file failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to delete file",
        500,
      );
    }
  },

  async deleteMultiple(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as { publicIds?: string[]; keys?: string[] };
      const publicIds = body.publicIds;
      const keys = body.keys;

      if (
        (!publicIds || publicIds.length === 0) &&
        (!keys || keys.length === 0)
      ) {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "publicIds or keys array is required",
          400,
        );
      }

      if (useR2() && keys && keys.length > 0) {
        await r2StorageService.deleteMultiple(keys);
      } else if (publicIds && publicIds.length > 0) {
        await cloudinaryService.deleteMultiple(publicIds);
      }

      return sendSuccess(reply, { message: "Files deleted successfully" });
    } catch (error: any) {
      logger.error({ error }, "Delete files failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to delete files",
        500,
      );
    }
  },
};
