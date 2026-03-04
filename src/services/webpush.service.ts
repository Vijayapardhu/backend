import webpush from 'web-push';
import { logger } from '../utils/logger.util';
import prisma from '../config/database';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BAIN_yNFBud4AQ1M9BUCKwuQnNxVIwnznWXcl7JmUKF84JR0TWRBWY0LJxl-bGW8arLqX1ysiByMZaEk6Ti5m3E';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'RUE9sFbe8Wx504JSGaujwutJMCcfGZHBVYjsodSG48o';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@hosthaven.com';

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

class WebPushService {
  async getVapidPublicKey(): Promise<string> {
    return VAPID_PUBLIC_KEY;
  }

  async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    const existing = await prisma.userPushSubscription.findFirst({
      where: { userId, endpoint: subscription.endpoint },
    });

    if (!existing) {
      await prisma.userPushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
      logger.info({ userId }, 'Push subscription saved');
    }
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await prisma.userPushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    logger.info({ userId }, 'Push subscription removed');
  }

  async sendNotification(userId: string, payload: PushNotificationPayload): Promise<void> {
    const subscriptions = await prisma.userPushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return;
    }

    const pushPayload = JSON.stringify({
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/badge-72x72.png',
        tag: payload.tag || 'hosthaven-notification',
        data: payload.data,
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload
          );
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.userPushSubscription.delete({
              where: { id: sub.id },
            });
            logger.warn({ subscriptionId: sub.id }, 'Removed expired push subscription');
          } else {
            logger.error({ error: error.message }, 'Failed to send push notification');
          }
        }
      })
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    logger.info({ userId, total: subscriptions.length, failed }, 'Push notifications sent');
  }

  async sendNotificationToMultiple(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    await Promise.all(
      userIds.map((userId) => this.sendNotification(userId, payload))
    );
  }
}

export const webPushService = new WebPushService();
export default webPushService;
