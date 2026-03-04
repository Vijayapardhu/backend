import { FastifyInstance } from 'fastify';
import { PaymentsController } from './payments.controller';

export default async function paymentsRoutes(fastify: FastifyInstance) {
  // Webhook route - no auth required
  fastify.post('/webhook', PaymentsController.webhook);

  // Protected routes
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/create-order', PaymentsController.createOrder);
  fastify.post('/verify', PaymentsController.verifyPayment);
  fastify.get('/:id', PaymentsController.getPayment);
}
