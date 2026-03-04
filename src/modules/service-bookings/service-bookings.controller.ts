import { FastifyReply, FastifyRequest } from 'fastify';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';
import { sendError, sendSuccess } from '../../utils/response.util';
import {
  createServiceBookingSchema,
  serviceBookingFilterSchema,
  serviceBookingIdSchema,
  updateServiceBookingStatusSchema,
  serviceBookingRefundSchema,
} from './service-bookings.schema';
import serviceBookingsService from './service-bookings.service';

export const ServiceBookingsController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = createServiceBookingSchema.parse(request.body);
      const userId = (request as any).user.id;

      const booking = await serviceBookingsService.create(userId, {
        ...payload,
        serviceDate: new Date(payload.serviceDate),
      });

      return sendSuccess(reply, booking, 201);
    } catch (error: any) {
      logger.error({ error }, 'Create service booking failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to create service booking', 500);
    }
  },

  async getMyBookings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = serviceBookingFilterSchema.parse(request.query);
      const userId = (request as any).user.id;

      const result = await serviceBookingsService.getMyBookings(userId, query);

      return sendSuccess(reply, result.bookings, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get my service bookings failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch service bookings', 500);
    }
  },

  async getAllForAdmin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = serviceBookingFilterSchema.parse(request.query);

      const result = await serviceBookingsService.getAllForAdmin(query);

      return sendSuccess(reply, result.bookings, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get all service bookings failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch service bookings', 500);
    }
  },

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = serviceBookingIdSchema.parse(request.params);
      const body = updateServiceBookingStatusSchema.parse(request.body);

      const booking = await serviceBookingsService.updateStatus(id, body.status, body.cancellationReason);

      return sendSuccess(reply, booking);
    } catch (error: any) {
      logger.error({ error }, 'Update service booking status failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to update status', 500);
    }
  },

  async getByIdForAdmin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = serviceBookingIdSchema.parse(request.params);
      const booking = await serviceBookingsService.getByIdForAdmin(id);
      return sendSuccess(reply, booking);
    } catch (error: any) {
      logger.error({ error }, 'Get service booking failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch service booking', 500);
    }
  },

  async refund(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = serviceBookingIdSchema.parse(request.params);
      const body = serviceBookingRefundSchema.parse(request.body);

      const result = await serviceBookingsService.refund(id, body.amount, body.reason);

      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Refund service booking failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to process refund', 500);
    }
  },
};
