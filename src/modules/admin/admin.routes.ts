import { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller';
import { requireRole } from '../../middleware/auth.middleware';
import { NotificationsController } from '../notifications/notifications.controller';

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', (fastify as any).authenticate);
  fastify.addHook('preHandler', requireRole('ADMIN'));

  fastify.get('/dashboard', AdminController.getDashboard);
  fastify.get('/stats', AdminController.getSystemStats);
  fastify.get('/analytics', AdminController.getAnalytics);
  fastify.get('/settings', AdminController.getSettings);
  fastify.put('/settings', AdminController.updateSettings);
  fastify.get('/settings/homepage', AdminController.getHomepageConfig);
  fastify.put('/settings/homepage', AdminController.updateHomepageConfig);

  fastify.get('/users', AdminController.getAllUsers);
  fastify.get('/users/:id', AdminController.getUserById);
  fastify.put('/users/:id/status', AdminController.updateUserStatus);
  fastify.delete('/users/:id', AdminController.softDeleteUser);
  fastify.put('/users/:id/verify-email', AdminController.verifyUserEmail);
  fastify.post('/users/:id/reset-password', AdminController.resetUserPassword);
  fastify.get('/users/:id/sessions', AdminController.getUserSessions);

  fastify.get('/properties', AdminController.getAllProperties);
  fastify.get('/properties/:id', AdminController.getPropertyById);
  fastify.put('/properties/:id', AdminController.updateProperty);
  fastify.delete('/properties/:id', AdminController.softDeleteProperty);
  fastify.post('/properties', AdminController.createProperty);
  fastify.put('/properties/:id/status', AdminController.updatePropertyStatus);

  fastify.get('/vendors', AdminController.getAllVendors);
  fastify.get('/vendors/:id', AdminController.getVendorById);
  fastify.put('/vendors/:id/status', AdminController.updateVendorStatus);
  fastify.put('/vendors/:id/commission', AdminController.updateVendorCommission);
  fastify.put('/vendors/:id', AdminController.updateVendor);
  fastify.delete('/vendors/:id', AdminController.softDeleteVendor);

  fastify.get('/bookings', AdminController.getAllBookings);
  fastify.get('/bookings/:id', AdminController.getBookingById);
  fastify.put('/bookings/:id/status', AdminController.updateBookingStatus);
  fastify.get('/bookings/:id/payment', AdminController.getPaymentDetails);
  fastify.put('/bookings/:id/refund', AdminController.refundBooking);

  fastify.get('/payments', AdminController.getAllPayments);
  fastify.put('/payments/:id/refund', AdminController.refundPayment);
  fastify.get('/refunds', AdminController.getAllRefunds);

  fastify.get('/payouts', AdminController.getAllPayouts);
  fastify.post('/payouts', AdminController.createPayout);
  fastify.get('/payouts/earnings', AdminController.getVendorEarnings);
  fastify.post('/payouts/process', AdminController.processPayout);
  fastify.put('/payouts/:id/mark-paid', AdminController.markPayoutPaid);

  fastify.put('/rooms/:id', AdminController.updateRoom);
  fastify.post('/rooms/:id/block', AdminController.blockRoomDates);
  fastify.get('/rooms/:id/inventory', AdminController.getRoomInventory);
  fastify.put('/rooms/:id/inventory/override', AdminController.overrideRoomInventory);
  fastify.delete('/rooms/:id/locks', AdminController.releaseRoomLocks);
  fastify.post('/inventory/cleanup', AdminController.cleanupInventoryLocks);

  fastify.get('/notifications', NotificationsController.getUserNotifications);
  fastify.put('/notifications/:id/read', NotificationsController.markAsRead);
  fastify.put('/notifications/read-all', NotificationsController.markAllAsRead);

  // Review moderation
  fastify.get('/reviews', AdminController.adminGetAllReviews);
  fastify.put('/reviews/:id', AdminController.adminUpdateReviewContent);
  fastify.put('/reviews/:id/hide', AdminController.adminHideReview);
  fastify.put('/reviews/:id/unhide', AdminController.adminUnhideReview);
  fastify.put('/reviews/:id/verify', AdminController.adminVerifyReview);
  fastify.delete('/reviews/:id', AdminController.adminDeleteReview);

  // Export Data
  fastify.get('/export/:entity', AdminController.exportDataCsv);
}
