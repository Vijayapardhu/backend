import { FastifyRequest, FastifyReply } from 'fastify';
import wishlistService from './wishlist.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';
import {
  addToWishlistSchema,
  wishlistFilterSchema,
  wishlistIdSchema,
} from './wishlist.schema';

export const WishlistController = {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = wishlistFilterSchema.parse(request.query);
      const userId = (request as any).user.id;

      const result = await wishlistService.getAll(userId, {
        page: query.page,
        limit: query.limit,
        itemType: query.itemType,
      });

      return sendSuccess(reply, result.items, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get wishlist failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid query parameters', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch wishlist', 500);
    }
  },

  async add(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = addToWishlistSchema.parse(request.body);
      const userId = (request as any).user.id;

      const item = await wishlistService.add(userId, data);

      return sendSuccess(reply, item, 201);
    } catch (error: any) {
      logger.error({ error }, 'Add to wishlist failed');
      if (error.code === ERROR_CODES.RESOURCE_CONFLICT) {
        return sendError(reply, error.code, error.message, 409);
      }
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to add to wishlist', 500);
    }
  },

  async remove(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = wishlistIdSchema.parse(request.params);
      const userId = (request as any).user.id;

      const result = await wishlistService.remove(id, userId);

      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Remove from wishlist failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to remove from wishlist', 500);
    }
  },

  async check(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { itemId, itemType } = request.query as { itemId: string; itemType: string };

      if (!itemId || !itemType) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'itemId and itemType are required', 400);
      }

      const userId = (request as any).user.id;
      const result = await wishlistService.checkItem(userId, itemId, itemType);

      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Check wishlist failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to check wishlist', 500);
    }
  },

  async clear(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;

      const result = await wishlistService.clear(userId);

      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Clear wishlist failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to clear wishlist', 500);
    }
  },
};
