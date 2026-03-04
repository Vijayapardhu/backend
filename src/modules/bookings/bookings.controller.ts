import { FastifyRequest, FastifyReply } from 'fastify';
import bookingsService from './bookings.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';
import {
  createBookingSchema,
  cancelBookingSchema,
  bookingFilterSchema,
  bookingIdSchema,
  checkPriceSchema,
} from './bookings.schema';

export const BookingsController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createBookingSchema.parse(request.body);
      const userId = (request as any).user.id;

      const result = await bookingsService.create({
        ...data,
        checkInDate: new Date(data.checkInDate),
        checkOutDate: new Date(data.checkOutDate),
        userId,
      });

      return sendSuccess(reply, result, 201);
    } catch (error: any) {
      logger.error({ error }, 'Create booking failed');
      
      if (error.code === ERROR_CODES.ROOM_NOT_AVAILABLE) {
        return sendError(reply, error.code, error.message, 409);
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to create booking', 500);
    }
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = bookingIdSchema.parse(request.params);
      const userId = (request as any).user.id;

      const booking = await bookingsService.getById(id, userId);
      return sendSuccess(reply, booking);
    } catch (error: any) {
      logger.error({ error }, 'Get booking failed');
      
      if (error.code === ERROR_CODES.BOOKING_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch booking', 500);
    }
  },

  async getUserBookings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = bookingFilterSchema.parse(request.query);
      const userId = (request as any).user.id;

      const result = await bookingsService.getUserBookings(userId, {
        page: query.page,
        limit: query.limit,
        status: query.status,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });

      return sendSuccess(reply, result.bookings, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get user bookings failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch bookings', 500);
    }
  },

  async cancel(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = bookingIdSchema.parse(request.params);
      const data = cancelBookingSchema.parse(request.body);
      const userId = (request as any).user.id;

      const result = await bookingsService.cancel(id, userId, data.reason);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Cancel booking failed');
      
      if (error.code === ERROR_CODES.BOOKING_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.code === ERROR_CODES.BOOKING_CANNOT_CANCEL) {
        return sendError(reply, error.code, error.message, 400);
      }
      
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to cancel booking', 500);
    }
  },

  async checkPrice(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = checkPriceSchema.parse(request.body);

      const result = await bookingsService.checkPrice({
        ...data,
        checkIn: new Date(data.checkIn),
        checkOut: new Date(data.checkOut),
      });

      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Check price failed');
      
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to calculate price', 500);
    }
  },

  async getVendorBookings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = bookingFilterSchema.parse(request.query);
      const user = (request as any).user;

      const result = await bookingsService.getVendorBookings(user.vendorId, {
        page: query.page,
        limit: query.limit,
        status: query.status,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });

      return sendSuccess(reply, result.bookings, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get vendor bookings failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch bookings', 500);
    }
  },

  async quickBooking(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const data = request.body as {
        propertyId: string;
        roomId: string;
        guestName: string;
        guestPhone: string;
        guestEmail?: string;
        checkInDate: string;
        checkOutDate: string;
        adults: number;
        children?: number;
        totalAmount: number;
        paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'RAZORPAY';
        isOnline?: boolean;
      };

      const result = await bookingsService.quickBooking({
        ...data,
        checkInDate: new Date(data.checkInDate),
        checkOutDate: new Date(data.checkOutDate),
        vendorId: user.vendorId,
      });

      return sendSuccess(reply, result, 201);
    } catch (error: any) {
      logger.error({ error }, 'Quick booking failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to create booking', 500);
    }
  },

  async checkIn(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = bookingIdSchema.parse(request.params);
      const user = (request as any).user;

      const result = await bookingsService.checkIn(id, user.vendorId);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Check in failed');
      if (error.code === ERROR_CODES.BOOKING_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to check in', 500);
    }
  },

  async checkOut(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = bookingIdSchema.parse(request.params);
      const user = (request as any).user;

      const result = await bookingsService.checkOut(id, user.vendorId);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Check out failed');
      if (error.code === ERROR_CODES.BOOKING_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to check out', 500);
    }
  },

  async generateInvoice(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = bookingIdSchema.parse(request.params);
      const user = (request as any).user;

      const invoice = await bookingsService.generateInvoice(id, user.id);
      return sendSuccess(reply, invoice);
    } catch (error: any) {
      logger.error({ error }, 'Generate invoice failed');
      if (error.code === ERROR_CODES.BOOKING_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to generate invoice', 500);
    }
  },

  async getRoomInventory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { date } = request.query as { date?: string };
      const targetDate = date ? new Date(date) : new Date();

      const inventory = await bookingsService.getRoomInventory(user.id, targetDate);
      return sendSuccess(reply, inventory);
    } catch (error: any) {
      logger.error({ error }, 'Get room inventory failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch inventory', 500);
    }
  },
};
