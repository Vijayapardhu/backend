import { FastifyRequest, FastifyReply } from 'fastify';
import roomsService from './rooms.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';
import {
  createRoomSchema,
  updateRoomSchema,
  roomIdSchema,
  roomFilterSchema,
} from './rooms.schema';

export const RoomsController = {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = roomFilterSchema.parse(request.query);

      const result = await roomsService.getAll({
        page: query.page,
        limit: query.limit,
        propertyId: query.propertyId,
        type: query.type,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        capacity: query.capacity,
      });

      return sendSuccess(reply, result.rooms, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get rooms failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid query parameters', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch rooms', 500);
    }
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = roomIdSchema.parse(request.params);
      const room = await roomsService.getById(id);
      return sendSuccess(reply, room);
    } catch (error: any) {
      logger.error({ error }, 'Get room failed');
      if (error.code === ERROR_CODES.ROOM_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch room', 500);
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createRoomSchema.parse(request.body);

      const room = await roomsService.create(data);

      return sendSuccess(reply, room, 201);
    } catch (error: any) {
      logger.error({ error }, 'Create room failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to create room', 500);
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = roomIdSchema.parse(request.params);
      const data = updateRoomSchema.parse(request.body);

      const room = await roomsService.update(id, data);

      return sendSuccess(reply, room);
    } catch (error: any) {
      logger.error({ error }, 'Update room failed');
      if (error.code === ERROR_CODES.ROOM_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to update room', 500);
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = roomIdSchema.parse(request.params);
      const result = await roomsService.delete(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Delete room failed');
      if (error.code === ERROR_CODES.ROOM_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to delete room', 500);
    }
  },

  async getByProperty(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { propertyId } = request.query as { propertyId: string };

      if (!propertyId) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'propertyId is required', 400);
      }

      const rooms = await roomsService.getByProperty(propertyId);
      return sendSuccess(reply, rooms);
    } catch (error: any) {
      logger.error({ error }, 'Get property rooms failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch rooms', 500);
    }
  },

  async checkAvailability(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = roomIdSchema.parse(request.params);
      const { checkIn, checkOut } = request.query as { checkIn: string; checkOut: string };

      if (!checkIn || !checkOut) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'checkIn and checkOut are required', 400);
      }

      const result = await roomsService.checkAvailability(
        id,
        new Date(checkIn),
        new Date(checkOut)
      );

      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Check room availability failed');
      if (error.code === ERROR_CODES.ROOM_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to check availability', 500);
    }
  },
};
