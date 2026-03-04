import prisma from '../../config/database';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';
import { generateBookingNumber } from '../../utils/crypto.util';

export class ServiceBookingsService {
  async create(userId: string, data: {
    serviceId?: string;
    serviceName: string;
    serviceCategory?: string;
    serviceDate: Date;
    serviceTime: string;
    location: string;
    notes?: string;
    advanceAmount: number;
    totalAmount?: number;
    razorpayPaymentId: string;
    razorpayOrderId?: string;
  }) {
    if (data.serviceId) {
      const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
      if (!service || !service.isActive) {
        const error = new Error('Service not found or inactive');
        (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
        throw error;
      }
    }

    const totalAmount = data.totalAmount ?? data.advanceAmount;
    const remainingAmount = Math.max(totalAmount - data.advanceAmount, 0);

    const booking = await prisma.serviceBooking.create({
      data: {
        bookingNumber: generateBookingNumber(),
        userId,
        serviceId: data.serviceId,
        serviceName: data.serviceName,
        serviceCategory: data.serviceCategory,
        serviceDate: data.serviceDate,
        serviceTime: data.serviceTime,
        location: data.location,
        notes: data.notes,
        advanceAmount: data.advanceAmount,
        totalAmount,
        remainingAmount,
        razorpayPaymentId: data.razorpayPaymentId,
        razorpayOrderId: data.razorpayOrderId,
        status: 'ADVANCE_PAID',
      },
    });

    logger.info({ serviceBookingId: booking.id }, 'Service booking created');

    return this.serialize(booking);
  }

  async getMyBookings(userId: string, filters: { page: number; limit: number; status?: string }) {
    const skip = (filters.page - 1) * filters.limit;
    const where: any = { userId };

    if (filters.status) where.status = filters.status;

    const [bookings, total] = await Promise.all([
      prisma.serviceBooking.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.serviceBooking.count({ where }),
    ]);

    return {
      bookings: bookings.map((booking: any) => this.serialize(booking)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getAllForAdmin(filters: { page: number; limit: number; status?: string }) {
    const skip = (filters.page - 1) * filters.limit;
    const where: any = {};

    if (filters.status) where.status = filters.status;

    const [bookings, total] = await Promise.all([
      prisma.serviceBooking.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
      prisma.serviceBooking.count({ where }),
    ]);

    return {
      bookings: bookings.map((booking: any) => this.serialize(booking)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async updateStatus(id: string, status: 'ADVANCE_PAID' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED', cancellationReason?: string) {
    const booking = await prisma.serviceBooking.findUnique({ where: { id } });

    if (!booking) {
      const error = new Error('Service booking not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.serviceBooking.update({
      where: { id },
      data: {
        status,
        adminContactedAt: status === 'CONFIRMED' ? new Date() : booking.adminContactedAt,
        cancelledAt: status === 'CANCELLED' ? new Date() : null,
        cancellationReason: status === 'CANCELLED' ? cancellationReason : null,
      },
    });

    logger.info({ serviceBookingId: id, status }, 'Service booking status updated');

    return this.serialize(updated);
  }

  async getByIdForAdmin(id: string) {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!booking) {
      const error = new Error('Service booking not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    return this.serialize(booking);
  }

  async refund(id: string, amount: number, reason?: string) {
    const booking = await prisma.serviceBooking.findUnique({ where: { id } });

    if (!booking) {
      const error = new Error('Service booking not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.serviceBooking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    logger.info({ serviceBookingId: id, amount }, 'Service booking refund requested');

    return {
      booking: this.serialize(updated),
      message: 'Refund recorded',
    };
  }

  private serialize(booking: any) {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      serviceBookingNumber: booking.bookingNumber,
      user: booking.user,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      serviceCategory: booking.serviceCategory,
      serviceDate: booking.serviceDate,
      serviceTime: booking.serviceTime,
      location: booking.location,
      notes: booking.notes,
      advanceAmount: booking.advanceAmount?.toNumber?.() ?? booking.advanceAmount,
      totalAmount: booking.totalAmount?.toNumber?.() ?? booking.totalAmount,
      remainingAmount: booking.remainingAmount?.toNumber?.() ?? booking.remainingAmount,
      razorpayPaymentId: booking.razorpayPaymentId,
      paymentStatus: booking.razorpayPaymentId ? 'COMPLETED' : 'PENDING',
      status: booking.status,
      adminContactedAt: booking.adminContactedAt,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}

export const serviceBookingsService = new ServiceBookingsService();
export default serviceBookingsService;
