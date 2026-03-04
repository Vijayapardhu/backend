import { FastifyInstance } from 'fastify';
import { ReviewsController } from './reviews.controller';
import { requireRole } from '../../middleware/auth.middleware';

export default async function reviewsRoutes(fastify: FastifyInstance) {
  // Specific routes must come before parameterized routes
  fastify.get('/property/:propertyId', ReviewsController.getPropertyReviews);
  fastify.get('/:id', ReviewsController.getById);
  fastify.get('/', ReviewsController.getAll);

  fastify.get(
    '/vendor',
    { preHandler: [fastify.authenticate, requireRole('VENDOR')] },
    ReviewsController.getVendorReviews
  );

  fastify.post(
    '/vendor/:id/respond',
    { preHandler: [fastify.authenticate, requireRole('VENDOR')] },
    ReviewsController.respondToReview
  );

  fastify.post(
    '/',
    { preHandler: fastify.authenticate },
    ReviewsController.create
  );

  fastify.put(
    '/:id',
    { preHandler: fastify.authenticate },
    ReviewsController.update
  );

  fastify.delete(
    '/:id',
    { preHandler: fastify.authenticate },
    ReviewsController.delete
  );
}
