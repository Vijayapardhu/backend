import { FastifyRequest, FastifyReply } from 'fastify';
import reviewsService from './reviews.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewFilterSchema,
  reviewIdSchema,
} from './reviews.schema';

export const ReviewsController = {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = reviewFilterSchema.parse(request.query);

      const result = await reviewsService.getAll({
        page: query.page,
        limit: query.limit,
        propertyId: query.propertyId,
        rating: query.rating,
      });

      return sendSuccess(reply, result.reviews, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get reviews failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid query parameters', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch reviews', 500);
    }
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = reviewIdSchema.parse(request.params);
      const review = await reviewsService.getById(id);
      return sendSuccess(reply, review);
    } catch (error: any) {
      logger.error({ error }, 'Get review failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch review', 500);
    }
  },

  async getPropertyReviews(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { propertyId } = request.params as { propertyId: string };
      const query = request.query as { page?: string; limit?: string };

      const result = await reviewsService.getPropertyReviews(
        propertyId,
        parseInt(query.page || '1'),
        parseInt(query.limit || '10')
      );

      return sendSuccess(reply, { reviews: result.reviews, stats: result.stats }, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get property reviews failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch reviews', 500);
    }
  },

  async getVendorReviews(request: FastifyRequest, reply: FastifyReply) {
    try {
      const vendorId = (request as any).user.vendorId;
      const query = request.query as { page?: string; limit?: string };

      const result = await reviewsService.getVendorReviews(
        vendorId,
        parseInt(query.page || '1'),
        parseInt(query.limit || '10')
      );

      return sendSuccess(reply, result.reviews, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get vendor reviews failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch reviews', 500);
    }
  },

  async respondToReview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = reviewIdSchema.parse(request.params);
      const vendorId = (request as any).user.vendorId;
      const data = request.body as { responseText: string };

      if (!data.responseText) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Response text is required', 400);
      }

      const review = await reviewsService.respondToReview(id, vendorId, data.responseText);

      return sendSuccess(reply, review);
    } catch (error: any) {
      logger.error({ error }, 'Respond to review failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to respond to review', 500);
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createReviewSchema.parse(request.body);
      const userId = (request as any).user.id;

      const review = await reviewsService.create({
        ...data,
        userId,
      });

      return sendSuccess(reply, review, 201);
    } catch (error: any) {
      logger.error({ error }, 'Create review failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.code === ERROR_CODES.FORBIDDEN) {
        return sendError(reply, error.code, error.message, 403);
      }
      if (error.code === ERROR_CODES.RESOURCE_CONFLICT) {
        return sendError(reply, error.code, error.message, 409);
      }
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to create review', 500);
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = reviewIdSchema.parse(request.params);
      const data = updateReviewSchema.parse(request.body);
      const userId = (request as any).user.id;

      const review = await reviewsService.update(id, userId, data);

      return sendSuccess(reply, review);
    } catch (error: any) {
      logger.error({ error }, 'Update review failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to update review', 500);
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = reviewIdSchema.parse(request.params);
      const userId = (request as any).user.id;
      const role = (request as any).user.role;

      const result = await reviewsService.delete(id, userId, role);

      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Delete review failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to delete review', 500);
    }
  },
};
