import { FastifyRequest, FastifyReply } from 'fastify';
import paymentsService from './payments.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  paymentIdSchema,
} from './payments.schema';

export const PaymentsController = {
  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { bookingId } = createPaymentOrderSchema.parse(request.body);
      const userId = (request as any).user.id;

      const result = await paymentsService.createOrder(bookingId, userId);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Create payment order failed');
      
      if (error.code === ERROR_CODES.BOOKING_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.code === ERROR_CODES.VALIDATION_ERROR) {
        return sendError(reply, error.code, error.message, 400);
      }
      
      return sendError(reply, ERROR_CODES.PAYMENT_FAILED, 'Failed to create payment order', 500);
    }
  },

  async verifyPayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = verifyPaymentSchema.parse(request.body);
      const userId = (request as any).user.id;

      const result = await paymentsService.verifyPayment(data, userId);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Payment verification failed');
      
      if (error.code === ERROR_CODES.PAYMENT_FAILED) {
        return sendError(reply, error.code, error.message, 400);
      }
      if (error.code === ERROR_CODES.UNAUTHORIZED) {
        return sendError(reply, error.code, error.message, 401);
      }
      
      return sendError(reply, ERROR_CODES.PAYMENT_FAILED, 'Payment verification failed', 500);
    }
  },

  async webhook(request: FastifyRequest, reply: FastifyReply) {
    try {
      const signature = request.headers['x-razorpay-signature'] as string;
      const payload = request.body;

      await paymentsService.handleWebhook(payload, signature);
      
      return reply.status(200).send({ success: true });
    } catch (error: any) {
      logger.error({ error }, 'Webhook handling failed');
      return reply.status(200).send({ success: true });
    }
  },

  async getPayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = paymentIdSchema.parse(request.params);
      const userId = (request as any).user.id;

      const payment = await paymentsService.getPaymentById(id, userId);
      return sendSuccess(reply, payment);
    } catch (error: any) {
      logger.error({ error }, 'Get payment failed');
      
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch payment', 500);
    }
  },
};
