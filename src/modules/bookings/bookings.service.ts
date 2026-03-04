import prisma from '../../config/database';
import { logger } from '../../utils/logger.util';
import { generateBookingNumber } from '../../utils/crypto.util';
import { hashPassword } from '../../utils/hash.util';
import inventoryService from '../inventory/inventory.service';
import { ERROR_CODES } from '../../constants/error-codes';
import { Prisma } from '@prisma/client';
import notificationsService from '../notifications/notifications.service';
import { webPushService } from '../../services/webpush.service';
import adminService from '../admin/admin.service';

export class BookingsService {
  async create(data: {
    propertyId: string;
    roomId?: string;
    checkInDate: Date;
    checkOutDate: Date;
    adults: number;
    children: number;
    extraBeds: number;
    specialRequests?: string;
    guestDetails?: any[];
    userId: string;
  }) {
    if (data.roomId) {
      await inventoryService.releaseLock(data.roomId, data.userId);
    }
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId, isDeleted: false },
      include: {
        rooms: data.roomId
          ? { where: { id: data.roomId, isDeleted: false, isActive: true } }
          : { where: { isDeleted: false, isActive: true } },
      },
    });

    if (!property) {
      const error = new Error('Property not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const room = data.roomId ? property.rooms.find((r) => r.id === data.roomId) : property.rooms[0];

    if (!room) {
      const error = new Error('Room not found');
      (error as any).code = ERROR_CODES.ROOM_NOT_FOUND;
      throw error;
    }

    const stayDates: Date[] = [];
    const current = new Date(data.checkInDate);
    while (current < data.checkOutDate) {
      stayDates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const inventoryDays = await prisma.inventoryDay.findMany({
      where: {
        roomId: room.id,
        date: { in: stayDates },
      },
    });

    const inventoryMap = new Map(
      inventoryDays.map((day) => [day.date.toISOString().slice(0, 10), day])
    );

    const hasAvailability = stayDates.every((date) => {
      const key = date.toISOString().slice(0, 10);
      const day = inventoryMap.get(key);
      const available = day ? day.availableRooms : room.totalRooms;
      return available > 0;
    });

    if (!hasAvailability) {
      const error = new Error('Room not available for selected dates');
      (error as any).code = ERROR_CODES.ROOM_NOT_AVAILABLE;
      throw error;
    }

    const totalGuests = data.adults + data.children;
    if (totalGuests > room.capacity + room.extraBedCapacity) {
      const error = new Error('Exceeds room capacity');
      (error as any).code = ERROR_CODES.VALIDATION_ERROR;
      throw error;
    }

    const nights = Math.ceil(
      (data.checkOutDate.getTime() - data.checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const basePrice = room.pricePerNight.toNumber();
    const baseAmount = basePrice * nights;
    const extraBedAmount = data.extraBeds * 500 * nights;
    const taxableAmount = baseAmount + extraBedAmount;
    const taxRate = 0.12;
    const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
    const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: generateBookingNumber(),
        userId: data.userId,
        propertyId: data.propertyId,
        roomId: room.id,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        adults: data.adults,
        children: data.children,
        extraBeds: data.extraBeds,
        baseAmount: new Prisma.Decimal(baseAmount + extraBedAmount),
        taxAmount: new Prisma.Decimal(taxAmount),
        discountAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(totalAmount),
        specialRequests: data.specialRequests,
        guestDetails: data.guestDetails,
        status: 'PENDING',
      },
      include: {
        property: true,
        room: true,
      },
    });

    await prisma.$transaction(
      stayDates.map((date) =>
        prisma.inventoryDay.upsert({
          where: {
            roomId_date: {
              roomId: room.id,
              date,
            },
          },
          update: {
            availableRooms: {
              decrement: 1,
            },
          },
          create: {
            roomId: room.id,
            date,
            totalRooms: room.totalRooms,
            availableRooms: Math.max(room.totalRooms - 1, 0),
          },
        })
      )
    );

    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.totalAmount,
        currency: 'INR',
        status: 'PENDING',
      },
    });

    logger.info({ bookingId: booking.id, bookingNumber: booking.bookingNumber }, 'Booking created');

    // Send notifications
    await this.sendBookingNotifications(booking, property, 'CREATED');

    return {
      booking: this.sanitizeBooking(booking),
      payment: {
        id: payment.id,
        amount: payment.amount.toNumber(),
        currency: payment.currency,
      },
    };
  }

  private async sendBookingNotifications(booking: any, property: any, action: string) {
    try {
      let userTitle = '';
      let userMessage = '';
      let vendorTitle = '';
      let vendorMessage = '';

      switch (action) {
        case 'CREATED':
          userTitle = 'Booking Confirmed';
          userMessage = `Your booking at ${property.name} is confirmed. Booking #: ${booking.bookingNumber}`;
          vendorTitle = 'New Booking Received';
          vendorMessage = `New booking at ${property.name}. Guest: ${booking.user?.name || 'Guest'}. Booking #: ${booking.bookingNumber}`;
          break;
        case 'CHECKED_IN':
          userTitle = 'Checked In';
          userMessage = `You have checked in at ${property.name}. Enjoy your stay!`;
          vendorTitle = 'Guest Check-in';
          vendorMessage = `${booking.user?.name || 'Guest'} has checked in to ${property.name}`;
          break;
        case 'CHECKED_OUT':
          userTitle = 'Checked Out';
          userMessage = `You have checked out from ${property.name}. Thank you for staying with us!`;
          vendorTitle = 'Guest Check-out';
          vendorMessage = `${booking.user?.name || 'Guest'} has checked out from ${property.name}`;
          break;
        case 'CANCELLED':
          userTitle = 'Booking Cancelled';
          userMessage = `Your booking at ${property.name} has been cancelled.`;
          vendorTitle = 'Booking Cancelled';
          vendorMessage = `${booking.user?.name || 'Guest'} has cancelled their booking.`;
          break;
      }

      await notificationsService.create({
        userId: booking.userId,
        type: `BOOKING_${action}`,
        title: userTitle,
        message: userMessage,
        data: { bookingId: booking.id, bookingNumber: booking.bookingNumber, propertyId: property.id },
      });

      await webPushService.sendNotification(booking.userId, {
        title: userTitle,
        body: userMessage,
        tag: `booking-${booking.id}`,
        data: { bookingId: booking.id, bookingNumber: booking.bookingNumber, propertyId: property.id },
      });

      if (property.vendorId) {
        // Resolve vendor's userId for notifications (vendorId is Vendor.id, not User.id)
        const vendor = await prisma.vendor.findUnique({
          where: { id: property.vendorId },
          select: { userId: true },
        });
        const vendorUserId = vendor?.userId;

        if (vendorUserId) {
          await notificationsService.create({
            userId: vendorUserId,
            type: `BOOKING_${action}`,
            title: vendorTitle,
            message: vendorMessage,
            data: { bookingId: booking.id, bookingNumber: booking.bookingNumber, propertyId: property.id },
          });

          await webPushService.sendNotification(vendorUserId, {
            title: vendorTitle,
            body: vendorMessage,
            tag: `booking-${booking.id}`,
            data: { bookingId: booking.id, bookingNumber: booking.bookingNumber, propertyId: property.id },
          });
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to send booking notifications');
    }
  }

  async getById(id: string, userId?: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        id,
        isDeleted: false,
        ...(userId ? { userId } : {}),
      },
      include: {
        property: true,
        room: true,
        payment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      const error = new Error('Booking not found');
      (error as any).code = ERROR_CODES.BOOKING_NOT_FOUND;
      throw error;
    }

    return this.sanitizeBooking(booking);
  }

  async getUserBookings(userId: string, filters: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = { userId, isDeleted: false };

    if (filters.status) {
      where.status = filters.status as any;
    }

    if (filters.startDate || filters.endDate) {
      where.checkInDate = {};
      if (filters.startDate) {
        where.checkInDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.checkInDate.lte = filters.endDate;
      }
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              type: true,
              city: true,
              images: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          payment: {
            select: {
              status: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings.map(this.sanitizeBooking),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancel(id: string, userId: string, reason?: string) {
    const booking = await prisma.booking.findFirst({
      where: { id, userId, isDeleted: false },
      include: { payment: true, property: true, room: true },
    });

    if (!booking) {
      const error = new Error('Booking not found');
      (error as any).code = ERROR_CODES.BOOKING_NOT_FOUND;
      throw error;
    }

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      const error = new Error('Booking cannot be cancelled');
      (error as any).code = ERROR_CODES.BOOKING_CANNOT_CANCEL;
      throw error;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason,
      },
    });

    if (booking.roomId) {
      const stayDates: Date[] = [];
      const current = new Date(booking.checkInDate);
      while (current < booking.checkOutDate) {
        stayDates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      const room = await prisma.room.findUnique({ where: { id: booking.roomId } });
      if (room) {
        await prisma.$transaction(
          stayDates.map((date) =>
            prisma.inventoryDay.upsert({
              where: {
                roomId_date: {
                  roomId: booking.roomId as string,
                  date,
                },
              },
              update: {
                availableRooms: {
                  increment: 1,
                },
              },
              create: {
                roomId: booking.roomId as string,
                date,
                totalRooms: room.totalRooms,
                availableRooms: room.totalRooms,
              },
            })
          )
        );
      }
    }

    if (booking.payment?.status === 'COMPLETED') {
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
        },
      });

      await prisma.refund.create({
        data: {
          paymentId: booking.payment.id,
          amount: booking.totalAmount,
          reason,
          status: 'initiated',
        },
      });
    }

    await this.sendBookingNotifications({ ...updated, user: { name: '' } }, booking.property, 'CANCELLED');

    logger.info({ bookingId: id }, 'Booking cancelled');

    return {
      booking: this.sanitizeBooking(updated),
    };
  }

  async checkPrice(data: {
    propertyId: string;
    roomId?: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    extraBeds: number;
  }) {
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
      include: {
        rooms: data.roomId ? { where: { id: data.roomId } } : { where: { isActive: true } },
      },
    });

    if (!property) {
      const error = new Error('Property not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const room = data.roomId
      ? property.rooms.find((r) => r.id === data.roomId)
      : property.rooms[0];

    if (!room) {
      const error = new Error('Room not found');
      (error as any).code = ERROR_CODES.ROOM_NOT_FOUND;
      throw error;
    }

    const nights = Math.ceil(
      (data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    const basePrice = room.pricePerNight.toNumber();
    const baseAmount = basePrice * nights;
    const extraBedAmount = data.extraBeds * 500 * nights;
    const taxableAmount = baseAmount + extraBedAmount;
    const taxRate = 0.12;
    const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
    const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

    return {
      baseAmount,
      extraBedAmount,
      taxAmount,
      totalAmount,
      nights,
      breakdown: {
        roomPrice: basePrice,
        nights,
        extraBeds: data.extraBeds,
        extraBedPricePerNight: 500,
        taxRate: `${taxRate * 100}%`,
      },
    };
  }

  async updateStatus(id: string, status: string, vendorId?: string) {
    const where: Prisma.BookingWhereInput = { id };

    if (vendorId) {
      where.property = { vendorId };
    }

    const booking = await prisma.booking.findFirst({ where });

    if (!booking) {
      const error = new Error('Booking not found');
      (error as any).code = ERROR_CODES.BOOKING_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: status as any },
    });

    return this.sanitizeBooking(updated);
  }

  async getVendorBookings(vendorId: string, filters: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const properties = await prisma.property.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const propertyIds = properties.map(p => p.id);

    const where: any = {
      propertyId: { in: propertyIds },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.checkInDate = {};
      if (filters.startDate) {
        where.checkInDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.checkInDate.lte = filters.endDate;
      }
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          property: { select: { id: true, name: true, city: true } },
          room: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
          payment: true,
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings.map(this.sanitizeBooking),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async quickBooking(data: {
    propertyId: string;
    roomId: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    checkInDate: Date;
    checkOutDate: Date;
    adults: number;
    children?: number;
    totalAmount: number;
    paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'RAZORPAY';
    isOnline?: boolean;
    vendorId: string;
  }) {
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property || property.vendorId !== data.vendorId) {
      const error = new Error('Property not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const room = await prisma.room.findUnique({
      where: { id: data.roomId },
    });

    if (!room || room.propertyId !== data.propertyId) {
      const error = new Error('Room not found');
      (error as any).code = ERROR_CODES.ROOM_NOT_FOUND;
      throw error;
    }

    const overlappingBookings = await prisma.booking.count({
      where: {
        roomId: data.roomId,
        status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
        OR: [
          {
            checkInDate: { lt: data.checkOutDate },
            checkOutDate: { gt: data.checkInDate },
          },
        ],
      },
    });

    const availableRooms = room.totalRooms - overlappingBookings;
    if (availableRooms < 1) {
      const error = new Error('No rooms available for selected dates');
      (error as any).code = ERROR_CODES.ROOM_NOT_AVAILABLE;
      throw error;
    }

    const nights = Math.ceil(
      (data.checkOutDate.getTime() - data.checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const taxRate = 0.12;
    const taxableAmount = data.totalAmount;
    const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;

    let user = await prisma.user.findFirst({
      where: { phone: data.guestPhone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: data.guestName,
          email: data.guestEmail || `${data.guestPhone}@guest.hosthaven`,
          phone: data.guestPhone,
          passwordHash: await hashPassword(Math.random().toString(36).slice(-8)),
          role: 'USER',
        },
      });
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: generateBookingNumber(),
        userId: user.id,
        propertyId: data.propertyId,
        roomId: data.roomId,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        adults: data.adults,
        children: data.children || 0,
        baseAmount: new Prisma.Decimal(data.totalAmount),
        taxAmount: new Prisma.Decimal(taxAmount),
        discountAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(data.totalAmount + taxAmount),
        status: 'CONFIRMED',
      },
      include: {
        property: true,
        room: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    const paymentStatus = data.paymentMethod === 'CASH' ? 'PENDING' : 'COMPLETED';
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.totalAmount,
        currency: 'INR',
        status: paymentStatus,
        method: data.paymentMethod,
      },
    });

    logger.info({ bookingId: booking.id, bookingNumber: booking.bookingNumber }, 'Quick booking created');

    return {
      booking: this.sanitizeBooking({ ...booking, payment }),
      invoice: this.generateInvoiceData(booking, property, room, user, payment),
    };
  }

  async checkIn(bookingId: string, vendorId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: true },
    });

    if (!booking || booking.property.vendorId !== vendorId) {
      const error = new Error('Booking not found');
      (error as any).code = ERROR_CODES.BOOKING_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CHECKED_IN',
        actualCheckIn: new Date(),
      },
      include: {
        property: true,
        room: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        payment: true,
      },
    });

    await this.sendBookingNotifications(updated, updated.property, 'CHECKED_IN');

    return this.sanitizeBooking(updated);
  }

  async checkOut(bookingId: string, vendorId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: true },
    });

    if (!booking || booking.property.vendorId !== vendorId) {
      const error = new Error('Booking not found');
      (error as any).code = ERROR_CODES.BOOKING_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CHECKED_OUT',
        actualCheckOut: new Date(),
      },
      include: {
        property: true,
        room: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        payment: true,
      },
    });

    await this.sendBookingNotifications(updated, updated.property, 'CHECKED_OUT');

    // Calculate commission for the vendor
    await adminService.calculateCommission(bookingId);

    return this.sanitizeBooking(updated);
  }

  async generateInvoice(bookingId: string, vendorId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: { include: { vendor: true } },
        room: true,
        user: true,
        payment: true,
      },
    });

    if (!booking || booking.property.vendorId !== vendorId) {
      const error = new Error('Booking not found');
      (error as any).code = ERROR_CODES.BOOKING_NOT_FOUND;
      throw error;
    }

    return this.generateInvoiceData(booking, booking.property, booking.room, booking.user, booking.payment);
  }

  private generateInvoiceData(booking: any, property: any, room: any, user: any, payment: any) {
    const nights = Math.ceil(
      (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      invoiceNumber: `INV-${booking.bookingNumber}`,
      invoiceDate: new Date().toISOString(),
      bookingDetails: {
        bookingNumber: booking.bookingNumber,
        checkIn: booking.checkInDate,
        checkOut: booking.checkOutDate,
        nights,
      },
      property: {
        name: property.name,
        address: `${property.address}, ${property.city}, ${property.state} ${property.pincode}`,
      },
      room: {
        name: room?.name || 'Standard Room',
        type: room?.type || 'Standard',
      },
      guest: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      pricing: {
        baseAmount: booking.baseAmount?.toNumber?.() || booking.baseAmount,
        taxAmount: booking.taxAmount?.toNumber?.() || booking.taxAmount,
        discountAmount: booking.discountAmount?.toNumber?.() || booking.discountAmount,
        totalAmount: booking.totalAmount?.toNumber?.() || booking.totalAmount,
      },
      payment: {
        status: payment?.status,
        method: payment?.method,
        amount: payment?.amount?.toNumber?.() || payment?.amount,
      },
      vendor: {
        name: property.vendor?.businessName || 'HostHaven',
        email: property.vendor?.user?.email || 'support@hosthaven.com',
        phone: property.vendor?.user?.phone || '',
      },
    };
  }

  async getRoomInventory(vendorId: string, date: Date) {
    const properties = await prisma.property.findMany({
      where: { vendorId },
      include: {
        rooms: {
          where: { isActive: true },
          include: {
            bookings: {
              where: {
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                checkInDate: { lte: date },
                checkOutDate: { gt: date },
              },
              select: {
                id: true,
                bookingNumber: true,
                checkInDate: true,
                checkOutDate: true,
                status: true,
                user: { select: { name: true, phone: true } },
              },
            },
          },
        },
      },
    });

    const inventory = properties.map(property => ({
      propertyId: property.id,
      propertyName: property.name,
      rooms: property.rooms.map(room => {
        const filledRooms = room.bookings.length;
        const availableRooms = room.totalRooms - filledRooms;

        return {
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          totalRooms: room.totalRooms,
          filledRooms,
          availableRooms,
          bookings: room.bookings.map(booking => ({
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            guestName: booking.user.name,
            phone: booking.user.phone,
            checkIn: booking.checkInDate,
            checkOut: booking.checkOutDate,
            status: booking.status,
          })),
        };
      }),
    }));

    return inventory;
  }

  private sanitizeBooking(booking: any) {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      property: booking.property,
      room: booking.room,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      adults: booking.adults,
      children: booking.children,
      extraBeds: booking.extraBeds,
      baseAmount: booking.baseAmount?.toNumber?.() || booking.baseAmount,
      taxAmount: booking.taxAmount?.toNumber?.() || booking.taxAmount,
      discountAmount: booking.discountAmount?.toNumber?.() || booking.discountAmount,
      totalAmount: booking.totalAmount?.toNumber?.() || booking.totalAmount,
      status: booking.status,
      specialRequests: booking.specialRequests,
      guestDetails: booking.guestDetails,
      payment: booking.payment,
      paymentStatus: booking.payment?.status || 'PENDING',
      user: booking.user,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      createdAt: booking.createdAt,
    };
  }
}

export const bookingsService = new BookingsService();
export default bookingsService;
