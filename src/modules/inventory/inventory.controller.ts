import { FastifyReply, FastifyRequest } from 'fastify';
import { sendError, sendSuccess } from '../../utils/response.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';
import inventoryService from './inventory.service';
import { inventoryLockSchema, inventoryReleaseSchema, inventoryQuerySchema } from './inventory.schema';

export const InventoryController = {
  async getAvailability(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = inventoryQuerySchema.parse(request.query);
      const result = await inventoryService.getAvailability(query.roomId, new Date(query.date));
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Get inventory availability failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch inventory', 500);
    }
  },

  async lock(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = inventoryLockSchema.parse(request.body);
      const userId = (request as any).user?.id;
      const result = await inventoryService.lockInventory(
        payload.roomId,
        userId,
        payload.quantity,
        new Date(payload.checkIn),
        new Date(payload.checkOut)
      );
      return sendSuccess(reply, result, 201);
    } catch (error: any) {
      logger.error({ error }, 'Lock inventory failed');
      if (error.code === ERROR_CODES.ROOM_NOT_AVAILABLE) {
        return sendError(reply, error.code, error.message, 409);
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to lock inventory', 500);
    }
  },

  async release(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = inventoryReleaseSchema.parse(request.body);
      const userId = (request as any).user?.id;
      const result = await inventoryService.releaseLock(payload.roomId, userId);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Release inventory lock failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to release inventory', 500);
    }
  },
};
