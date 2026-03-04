import { FastifyReply, FastifyRequest } from 'fastify';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';
import { sendError, sendSuccess } from '../../utils/response.util';
import {
  createSupportTicketSchema,
  supportFilterSchema,
  supportTicketIdSchema,
  updateSupportTicketSchema,
} from './support.schema';
import supportService from './support.service';

export const SupportController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = createSupportTicketSchema.parse(request.body);
      const userId = (request as any).user.id;

      const ticket = await supportService.create(userId, payload);
      return sendSuccess(reply, ticket, 201);
    } catch (error: any) {
      logger.error({ error }, 'Create support ticket failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to create support ticket', 500);
    }
  },

  async getMyTickets(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = supportFilterSchema.parse(request.query);
      const userId = (request as any).user.id;

      const result = await supportService.getMyTickets(userId, query);
      return sendSuccess(reply, result.tickets, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get my support tickets failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch support tickets', 500);
    }
  },

  async getAllTickets(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = supportFilterSchema.parse(request.query);
      const result = await supportService.getAllTickets(query);
      return sendSuccess(reply, result.tickets, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get all support tickets failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch support tickets', 500);
    }
  },

  async updateTicket(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = supportTicketIdSchema.parse(request.params);
      const payload = updateSupportTicketSchema.parse(request.body);

      const ticket = await supportService.updateTicket(id, payload);
      return sendSuccess(reply, ticket);
    } catch (error: any) {
      logger.error({ error }, 'Update support ticket failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to update support ticket', 500);
    }
  },

  async getTicketById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = supportTicketIdSchema.parse(request.params);
      const ticket = await supportService.getTicketById(id);
      return sendSuccess(reply, ticket);
    } catch (error: any) {
      logger.error({ error }, 'Get support ticket by ID failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to get ticket', 500);
    }
  },

  async addNote(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = supportTicketIdSchema.parse(request.params);
      const { content } = request.body as { content: string };
      if (!content || !content.trim()) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Note content is required', 400);
      }
      const adminName = (request as any).user?.name || 'Admin';
      const ticket = await supportService.addNote(id, content.trim(), adminName);
      return sendSuccess(reply, ticket);
    } catch (error: any) {
      logger.error({ error }, 'Add note to support ticket failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to add note', 500);
    }
  },

  async reopenTicket(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = supportTicketIdSchema.parse(request.params);
      const ticket = await supportService.reopenTicket(id);
      return sendSuccess(reply, ticket);
    } catch (error: any) {
      logger.error({ error }, 'Reopen support ticket failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to reopen ticket', 500);
    }
  },
};
