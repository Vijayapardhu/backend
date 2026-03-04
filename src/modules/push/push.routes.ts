import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../../middleware/auth.middleware';
import { webPushService } from '../../services/webpush.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger.util';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export default async function pushRoutes(fastify: FastifyInstance) {
  fastify.get('/push/vapid-key', async (request, reply) => {
    try {
      const publicKey = await webPushService.getVapidPublicKey();
      return sendSuccess(reply, { publicKey });
    } catch (error) {
      logger.error({ error }, 'Failed to get VAPID key');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to get VAPID key', 500);
    }
  });

  fastify.post(
    '/push/subscribe',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = (request as any).user.id;
        const subscription = subscriptionSchema.parse(request.body);
        
        await webPushService.saveSubscription(userId, subscription);
        
        return sendSuccess(reply, { message: 'Subscription saved' });
      } catch (error: any) {
        logger.error({ error }, 'Failed to save subscription');
        if (error.name === 'ZodError') {
          return sendError(reply, 'VALIDATION_ERROR', 'Invalid subscription data', 400);
        }
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to save subscription', 500);
      }
    }
  );

  fastify.delete(
    '/push/unsubscribe',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = (request as any).user.id;
        const { endpoint } = request.body as { endpoint: string };
        
        if (!endpoint) {
          return sendError(reply, 'VALIDATION_ERROR', 'Endpoint is required', 400);
        }
        
        await webPushService.removeSubscription(userId, endpoint);
        
        return sendSuccess(reply, { message: 'Subscription removed' });
      } catch (error) {
        logger.error({ error }, 'Failed to remove subscription');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to remove subscription', 500);
      }
    }
  );
}
