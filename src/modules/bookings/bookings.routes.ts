import { FastifyInstance } from 'fastify';
import { BookingsController } from './bookings.controller';
import { requireRole } from '../../middleware/auth.middleware';

export default async function bookingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/', BookingsController.create);
  fastify.post('/check-price', BookingsController.checkPrice);
  fastify.get('/', BookingsController.getUserBookings);
  fastify.get('/:id', BookingsController.getById);
  fastify.put('/:id/cancel', BookingsController.cancel);

  fastify.get(
    '/vendor/bookings',
    { preHandler: [requireRole('VENDOR')] },
    BookingsController.getVendorBookings
  );

  fastify.post(
    '/vendor/quick-booking',
    { preHandler: [requireRole('VENDOR')] },
    BookingsController.quickBooking
  );

  fastify.put(
    '/vendor/:id/check-in',
    { preHandler: [requireRole('VENDOR')] },
    BookingsController.checkIn
  );

  fastify.put(
    '/vendor/:id/check-out',
    { preHandler: [requireRole('VENDOR')] },
    BookingsController.checkOut
  );

  fastify.get(
    '/vendor/:id/invoice',
    { preHandler: [requireRole('VENDOR')] },
    BookingsController.generateInvoice
  );

  fastify.get(
    '/vendor/inventory',
    { preHandler: [requireRole('VENDOR')] },
    BookingsController.getRoomInventory
  );
}
