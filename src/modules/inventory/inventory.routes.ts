import { FastifyInstance } from 'fastify';
import { InventoryController } from './inventory.controller';

export default async function inventoryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', InventoryController.getAvailability);
  fastify.post('/lock', InventoryController.lock);
  fastify.post('/release', InventoryController.release);
}
