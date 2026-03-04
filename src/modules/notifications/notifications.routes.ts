import { FastifyInstance } from 'fastify';
import { NotificationsController } from './notifications.controller';

export default async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', NotificationsController.getAll);
  fastify.get('/:id', NotificationsController.getById);
  fastify.put('/:id/read', NotificationsController.markAsRead);
  fastify.put('/read-all', NotificationsController.markAllAsRead);
  fastify.delete('/:id', NotificationsController.delete);
  fastify.delete('/', NotificationsController.deleteAll);
}
