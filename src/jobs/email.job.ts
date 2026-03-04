import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger.util';
import prisma from '../config/database';

const connection = config.redis.enabled
  ? new Redis(config.redis.url, { maxRetriesPerRequest: null })
  : null;

export const emailWorker = config.redis.enabled
  ? new Worker(
      'email-queue',
      async (job: Job) => {
        logger.info({ jobId: job.id, name: job.name }, 'Processing email job');

        const { type, data } = job.data;

        switch (type) {
          case 'booking-confirmed':
            await handleBookingConfirmed(data);
            break;
          case 'booking-cancelled':
            await handleBookingCancelled(data);
            break;
          case 'payment-reminder':
            await handlePaymentReminder(data);
            break;
          case 'review-request':
            await handleReviewRequest(data);
            break;
          default:
            logger.warn({ jobType: type }, 'Unknown email job type');
        }
      },
      {
        connection: connection as any,
        concurrency: 5,
      }
    )
  : null;

if (emailWorker) {
  emailWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Email job completed');
  });

  emailWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Email job failed');
  });
}

async function handleBookingConfirmed(data: any) {
  const { userEmail, userName, propertyName, checkIn, checkOut, bookingNumber, totalAmount } = data;
  
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  await transporter.sendMail({
    from: config.email.from,
    to: userEmail,
    subject: `Booking Confirmed - ${bookingNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4a574;">Booking Confirmed! 🎉</h2>
        <p>Dear ${userName},</p>
        <p>Your booking has been confirmed successfully.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${propertyName}</h3>
          <p><strong>Booking ID:</strong> ${bookingNumber}</p>
          <p><strong>Check-in:</strong> ${new Date(checkIn).toLocaleDateString()}</p>
          <p><strong>Check-out:</strong> ${new Date(checkOut).toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
        </div>
        <p>We look forward to hosting you!</p>
        <p>Best regards,<br>HostHaven Team</p>
      </div>
    `,
  });

  logger.info({ bookingNumber }, 'Booking confirmation email sent');
}

async function handleBookingCancelled(data: any) {
  const { userEmail, userName, propertyName, bookingNumber } = data;
  
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  await transporter.sendMail({
    from: config.email.from,
    to: userEmail,
    subject: `Booking Cancelled - ${bookingNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Booking Cancelled</h2>
        <p>Dear ${userName},</p>
        <p>Your booking (${bookingNumber}) for ${propertyName} has been cancelled.</p>
        <p>We hope to serve you again in the future.</p>
        <p>Best regards,<br>HostHaven Team</p>
      </div>
    `,
  });

  logger.info({ bookingNumber }, 'Booking cancellation email sent');
}

async function handlePaymentReminder(data: any) {
  const { userEmail, userName, propertyName, bookingNumber, amount, dueDate } = data;
  
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  await transporter.sendMail({
    from: config.email.from,
    to: userEmail,
    subject: `Payment Reminder - ${bookingNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f39c12;">Payment Reminder ⏰</h2>
        <p>Dear ${userName},</p>
        <p>This is a friendly reminder that your payment for booking ${bookingNumber} is pending.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Property:</strong> ${propertyName}</p>
          <p><strong>Amount Due:</strong> ₹${amount}</p>
          <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        </div>
        <p>Please complete your payment to confirm your booking.</p>
        <p>Best regards,<br>HostHaven Team</p>
      </div>
    `,
  });

  logger.info({ bookingNumber }, 'Payment reminder email sent');
}

async function handleReviewRequest(data: any) {
  const { userEmail, userName, propertyName, bookingNumber } = data;
  
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  const frontendUrl = config.app.frontendUrl;

  await transporter.sendMail({
    from: config.email.from,
    to: userEmail,
    subject: `How was your stay at ${propertyName}?`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4a574;">Share Your Experience! 🌟</h2>
        <p>Dear ${userName},</p>
        <p>Thank you for staying at ${propertyName}. We hope you had a wonderful experience!</p>
        <p>Your feedback helps us improve and helps other travelers make informed decisions.</p>
        <a href="${frontendUrl}/review/${bookingNumber}" 
           style="display: inline-block; padding: 12px 24px; background: #d4a574; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
          Write a Review
        </a>
        <p>Thank you for your time!</p>
        <p>Best regards,<br>HostHaven Team</p>
      </div>
    `,
  });

  logger.info({ bookingNumber }, 'Review request email sent');
}

export default emailWorker;
