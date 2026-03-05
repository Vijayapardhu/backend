import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger.util';

const url = new URL(config.redis.url);

const connection = config.redis.enabled
  ? new Redis({
    host: url.hostname || '127.0.0.1',
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    family: 4,
    maxRetriesPerRequest: null
  })
  : null;

export const emailQueue = config.redis.enabled
  ? new Queue('email-queue', { connection: connection as any })
  : null;

export const queueService = config.redis.enabled
  ? {
    async addBookingConfirmedJob(data: {
      userEmail: string;
      userName: string;
      propertyName: string;
      checkIn: Date;
      checkOut: Date;
      bookingNumber: string;
      totalAmount: number;
    }) {
      await emailQueue?.add('booking-confirmed', {
        type: 'booking-confirmed',
        ...data,
      });
      logger.info({ bookingNumber: data.bookingNumber }, 'Added booking confirmation job to queue');
    },

    async addBookingCancelledJob(data: {
      userEmail: string;
      userName: string;
      propertyName: string;
      bookingNumber: string;
    }) {
      await emailQueue?.add('booking-cancelled', {
        type: 'booking-cancelled',
        ...data,
      });
      logger.info({ bookingNumber: data.bookingNumber }, 'Added booking cancellation job to queue');
    },

    async addPaymentReminderJob(data: {
      userEmail: string;
      userName: string;
      propertyName: string;
      bookingNumber: string;
      amount: number;
      dueDate: Date;
    }) {
      await emailQueue?.add('payment-reminder', {
        type: 'payment-reminder',
        ...data,
      });
      logger.info({ bookingNumber: data.bookingNumber }, 'Added payment reminder job to queue');
    },

    async addReviewRequestJob(data: {
      userEmail: string;
      userName: string;
      propertyName: string;
      bookingNumber: string;
    }) {
      await emailQueue?.add('review-request', {
        type: 'review-request',
        ...data,
      });
      logger.info({ bookingNumber: data.bookingNumber }, 'Added review request job to queue');
    },
  }
  : {
    async addBookingConfirmedJob(data: { bookingNumber: string }) {
      logger.warn({ bookingNumber: data.bookingNumber }, 'Redis disabled, skipping email queue job');
    },
    async addBookingCancelledJob(data: { bookingNumber: string }) {
      logger.warn({ bookingNumber: data.bookingNumber }, 'Redis disabled, skipping email queue job');
    },
    async addPaymentReminderJob(data: { bookingNumber: string }) {
      logger.warn({ bookingNumber: data.bookingNumber }, 'Redis disabled, skipping email queue job');
    },
    async addReviewRequestJob(data: { bookingNumber: string }) {
      logger.warn({ bookingNumber: data.bookingNumber }, 'Redis disabled, skipping email queue job');
    },
  };

export default queueService;
