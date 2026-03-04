import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { logger } from '../../utils/logger.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { sendEmail } from '../../services/email.service';
import { Prisma } from '@prisma/client';

const ensureRazorpayCredentials = () => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    const error = new Error(
      'Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
    );
    (error as any).code = ERROR_CODES.PAYMENT_FAILED;
    throw error;
  }
};

let razorpayClient: Razorpay | null = null;

const getRazorpayClient = () => {
  if (!razorpayClient) {
    ensureRazorpayCredentials();
    razorpayClient = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }

  return razorpayClient;
};

export class PaymentsService {
  async createOrder(bookingId: string, userId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId },
      include: { property: true },
    });

    if (!booking) {
      const error = new Error('Booking not found');
      (error as any).code = ERROR_CODES.BOOKING_NOT_FOUND;
      throw error;
    }

    if (booking.status !== 'PENDING') {
      const error = new Error('Booking is not pending payment');
      (error as any).code = ERROR_CODES.VALIDATION_ERROR;
      throw error;
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { bookingId },
    });

    if (existingPayment?.razorpayOrderId) {
      return {
        orderId: existingPayment.razorpayOrderId,
        amount: existingPayment.amount.toNumber(),
        currency: existingPayment.currency,
        keyId: config.razorpay.keyId,
      };
    }

    const amount = booking.totalAmount.toNumber() * 100;

    const order = await getRazorpayClient().orders.create({
      amount,
      currency: 'INR',
      receipt: booking.bookingNumber,
      notes: {
        bookingId: booking.id,
        propertyName: booking.property.name,
      },
    });

    await prisma.payment.update({
      where: { bookingId },
      data: {
        razorpayOrderId: order.id,
        status: 'PROCESSING',
      },
    });

    logger.info({ bookingId, orderId: order.id }, 'Payment order created');

    return {
      orderId: order.id,
      amount: amount / 100,
      currency: 'INR',
      keyId: config.razorpay.keyId,
    };
  }

  async verifyPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: data.razorpay_order_id },
      include: {
        booking: {
          include: { property: true, user: true },
        },
      },
    });

    if (!payment) {
      const error = new Error('Payment not found');
      (error as any).code = ERROR_CODES.PAYMENT_FAILED;
      throw error;
    }

    if (payment.booking.userId !== userId) {
      const error = new Error('Unauthorized');
      (error as any).code = ERROR_CODES.UNAUTHORIZED;
      throw error;
    }

    const body = data.razorpay_order_id + '|' + data.razorpay_payment_id;
    ensureRazorpayCredentials();
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== data.razorpay_signature) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          errorCode: 'SIGNATURE_MISMATCH',
          errorDesc: 'Payment signature verification failed',
        },
      });

      const error = new Error('Payment verification failed');
      (error as any).code = ERROR_CODES.PAYMENT_FAILED;
      throw error;
    }

    const [updatedPayment, updatedBooking] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          razorpayPaymentId: data.razorpay_payment_id,
          razorpaySignature: data.razorpay_signature,
          method: 'RAZORPAY',
        },
      }),
      prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      }),
    ]);

    await sendEmail({
      to: payment.booking.user.email,
      subject: 'Booking Confirmed - HostHaven',
      template: 'booking-confirmed',
      data: {
        name: payment.booking.user.name,
        propertyName: payment.booking.property.name,
        checkIn: payment.booking.checkInDate.toLocaleDateString(),
        checkOut: payment.booking.checkOutDate.toLocaleDateString(),
        bookingId: payment.booking.bookingNumber,
        totalAmount: payment.booking.totalAmount.toNumber(),
      },
    });

    logger.info({ paymentId: payment.id, bookingId: payment.bookingId }, 'Payment verified');

    return {
      payment: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        amount: updatedPayment.amount.toNumber(),
      },
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        bookingNumber: updatedBooking.bookingNumber,
      },
    };
  }

  async handleWebhook(payload: any, signature: string) {
    const webhookSecret = config.razorpay.webhookSecret;
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.error({ signature }, 'Invalid webhook signature');
      return { success: false };
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (!paymentEntity) {
      return { success: true };
    }

    const orderId = paymentEntity.order_id;

    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: orderId },
    });

    if (!payment) {
      return { success: true };
    }

    switch (event) {
      case 'payment.captured':
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'COMPLETED',
              razorpayPaymentId: paymentEntity.id,
              method: paymentEntity.method?.toUpperCase() as any,
            },
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CONFIRMED' },
          }),
        ]);
        break;

      case 'payment.failed':
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'FAILED',
              errorCode: paymentEntity.error_code,
              errorDesc: paymentEntity.error_description,
            },
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CANCELLED' },
          }),
        ]);
        break;

      case 'refund.created':
      case 'refund.processed':
        const refundAmount = paymentEntity.amount_refunded / 100;
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: refundAmount >= payment.amount.toNumber() ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
              refundedAt: new Date(),
            },
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'REFUNDED' },
          }),
          prisma.refund.create({
            data: {
              paymentId: payment.id,
              amount: new Prisma.Decimal(refundAmount),
              status: event === 'refund.processed' ? 'processed' : 'initiated',
              razorpayRefundId: paymentEntity.id,
            },
          }),
        ]);
        break;
    }

    logger.info({ event, orderId }, 'Webhook processed');
    return { success: true };
  }

  async getPaymentById(id: string, userId?: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        ...(userId ? { booking: { userId } } : {}),
      },
      include: {
        booking: {
          include: { property: true },
        },
      },
    });

    if (!payment) {
      const error = new Error('Payment not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const refunds = await prisma.refund.findMany({
      where: { paymentId: payment.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      id: payment.id,
      amount: payment.amount.toNumber(),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      receiptUrl: payment.receiptUrl,
      refundedAt: payment.refundedAt,
      createdAt: payment.createdAt,
      refunds: refunds.map((refund) => ({
        id: refund.id,
        amount: refund.amount.toNumber(),
        reason: refund.reason,
        status: refund.status,
        createdAt: refund.createdAt,
      })),
      booking: {
        id: payment.booking.id,
        bookingNumber: payment.booking.bookingNumber,
        status: payment.booking.status,
        property: payment.booking.property,
      },
    };
  }
}

export const paymentsService = new PaymentsService();
export default paymentsService;
