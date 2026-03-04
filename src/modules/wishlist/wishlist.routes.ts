import { FastifyInstance } from 'fastify';
import { WishlistController } from './wishlist.controller';

export default async function wishlistRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', WishlistController.getAll);
  fastify.get('/check', WishlistController.check);
  fastify.post('/', WishlistController.add);
  fastify.delete('/clear', WishlistController.clear);
  fastify.delete('/:id', WishlistController.remove);
}
