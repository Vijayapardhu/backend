import { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/auth.middleware';
import { SupportController } from './support.controller';

export default async function supportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/tickets', SupportController.create);
  fastify.get('/tickets/my', SupportController.getMyTickets);

  // Admin routes
  fastify.get('/tickets/admin', { preHandler: [requireRole('ADMIN')] }, SupportController.getAllTickets);
  fastify.get('/tickets/admin/:id', { preHandler: [requireRole('ADMIN')] }, SupportController.getTicketById);
  fastify.put('/tickets/admin/:id', { preHandler: [requireRole('ADMIN')] }, SupportController.updateTicket);
  fastify.post('/tickets/admin/:id/notes', { preHandler: [requireRole('ADMIN')] }, SupportController.addNote);
  fastify.put('/tickets/admin/:id/reopen', { preHandler: [requireRole('ADMIN')] }, SupportController.reopenTicket);
}
