import prisma from '../../config/database';
import { hashPassword, verifyPassword } from '../../utils/hash.util';
import { generateTokens } from '../../utils/token.util';
import { logger } from '../../utils/logger.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { Prisma } from '@prisma/client';
import notificationsService from '../notifications/notifications.service';
import { webPushService } from '../../services/webpush.service';
import type { AdminCreateVendorOnboardingInput } from './vendor.schema';

const toStartOfDayUtc = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid block date: ${dateString}`);
    (error as any).code = ERROR_CODES.VALIDATION_ERROR;
    throw error;
  }
  return date;
};

export class VendorService {
  async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    businessName: string;
    businessAddress?: string;
    gstNumber?: string;
    panNumber?: string;
    aadhaarNumber?: string;
    bankAccount?: any;
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      const error = new Error('Email already registered');
      (error as any).code = ERROR_CODES.RESOURCE_CONFLICT;
      throw error;
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await hashPassword(data.password),
        name: data.name,
        phone: data.phone,
        role: 'VENDOR',
      },
    });

    const vendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        businessName: data.businessName,
        businessAddress: data.businessAddress,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        aadhaarNumber: data.aadhaarNumber,
        bankAccount: data.bankAccount,
        isApproved: false,
      },
    });

    const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role });

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info({ vendorId: vendor.id, userId: user.id }, 'Vendor registered');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        isApproved: vendor.isApproved,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { vendor: true },
    });

    if (!user || !user.passwordHash) {
      const error = new Error('Invalid credentials');
      (error as any).code = ERROR_CODES.UNAUTHORIZED;
      throw error;
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      const error = new Error('Invalid credentials');
      (error as any).code = ERROR_CODES.UNAUTHORIZED;
      throw error;
    }

    if (user.role !== 'VENDOR') {
      const error = new Error('Not authorized as vendor');
      (error as any).code = ERROR_CODES.FORBIDDEN;
      throw error;
    }

    const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role });

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info({ userId: user.id }, 'Vendor logged in');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      vendor: user.vendor ? {
        id: user.vendor.id,
        businessName: user.vendor.businessName,
        isApproved: user.vendor.isApproved,
      } : null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async getDashboard(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: { name: true, email: true, phone: true, avatarUrl: true },
        },
      },
    });

    if (!vendor) {
      const error = new Error('Vendor not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const [
      propertiesCount,
      activeBookings,
      totalRevenue,
      recentBookings,
      pendingPayouts,
    ] = await Promise.all([
      prisma.property.count({ where: { vendorId } }),
      prisma.booking.count({
        where: {
          property: { vendorId },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      }),
      prisma.booking.aggregate({
        where: {
          property: { vendorId },
          status: { in: ['CHECKED_OUT'] },
          payment: { status: 'COMPLETED' },
        },
        _sum: { totalAmount: true },
      }),
      prisma.booking.findMany({
        where: { property: { vendorId } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          property: { select: { name: true } },
          room: { select: { name: true } },
        },
      }),
      prisma.payout.findMany({
        where: { vendorId, status: 'pending' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        isApproved: vendor.isApproved,
        commissionRate: vendor.commissionRate.toNumber(),
        user: vendor.user,
      },
      stats: {
        propertiesCount,
        activeBookings,
        totalRevenue: totalRevenue._sum.totalAmount?.toNumber() || 0,
        pendingPayouts: pendingPayouts.length,
      },
      recentBookings: recentBookings.map((b: any) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        user: b.user,
        property: b.property,
        room: b.room,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        totalAmount: b.totalAmount.toNumber(),
        status: b.status,
        createdAt: b.createdAt,
      })),
    };
  }

  async getVendorProfile(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!vendor) {
      const error = new Error('Vendor not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    return {
      id: vendor.id,
      businessName: vendor.businessName,
      businessAddress: vendor.businessAddress,
      gstNumber: vendor.gstNumber,
      panNumber: vendor.panNumber,
      aadhaarNumber: vendor.aadhaarNumber,
      bankAccount: vendor.bankAccount,
      isApproved: vendor.isApproved,
      approvedAt: vendor.approvedAt,
      commissionRate: vendor.commissionRate.toNumber(),
      user: vendor.user,
      createdAt: vendor.createdAt,
    };
  }

  async updateVendor(vendorId: string, data: {
    businessName?: string;
    businessAddress?: string;
    gstNumber?: string;
    panNumber?: string;
    aadhaarNumber?: string;
    bankAccount?: any;
  }) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      const error = new Error('Vendor not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data,
    });

    logger.info({ vendorId }, 'Vendor profile updated');

    return {
      id: updated.id,
      businessName: updated.businessName,
      businessAddress: updated.businessAddress,
      gstNumber: updated.gstNumber,
      panNumber: updated.panNumber,
      aadhaarNumber: updated.aadhaarNumber,
      bankAccount: updated.bankAccount,
    };
  }

  async getEarningsSummary(vendorId: string) {
    const [
      totalEarnings,
      pendingCommissions,
      paidCommissions,
      completedPayouts,
      pendingPayouts,
      recentPayouts,
    ] = await Promise.all([
      prisma.booking.aggregate({
        where: {
          property: { vendorId },
          status: { in: ['CHECKED_OUT'] },
          payment: { status: 'COMPLETED' },
        },
        _sum: { totalAmount: true },
      }),
      // Pending = no payout assigned yet
      prisma.commissionLedger.aggregate({
        where: { vendorId, payoutId: null },
        _sum: { commissionAmount: true, vendorEarning: true },
        _count: true,
      }),
      // Paid = has a payout assigned
      prisma.commissionLedger.aggregate({
        where: { vendorId, payoutId: { not: null } },
        _sum: { commissionAmount: true, vendorEarning: true },
        _count: true,
      }),
      prisma.payout.aggregate({
        where: { vendorId, status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payout.aggregate({
        where: { vendorId, status: { in: ['pending', 'PROCESSING'] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payout.findMany({
        where: { vendorId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalRevenue: totalEarnings._sum.totalAmount?.toNumber() || 0,
      pendingCommissions: {
        amount: pendingCommissions._sum.vendorEarning?.toNumber() || 0,
        commissionAmount: pendingCommissions._sum.commissionAmount?.toNumber() || 0,
        count: pendingCommissions._count,
      },
      paidCommissions: {
        amount: paidCommissions._sum.vendorEarning?.toNumber() || 0,
        commissionAmount: paidCommissions._sum.commissionAmount?.toNumber() || 0,
        count: paidCommissions._count,
      },
      completedPayouts: {
        amount: completedPayouts._sum.amount?.toNumber() || 0,
        count: completedPayouts._count,
      },
      pendingPayouts: {
        amount: pendingPayouts._sum.amount?.toNumber() || 0,
        count: pendingPayouts._count,
      },
      recentPayouts: recentPayouts.map((p: any) => ({
        id: p.id,
        amount: p.amount.toNumber(),
        status: p.status,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
      })),
    };
  }

  async getPayoutHistory(vendorId: string, filters: { page?: number; limit?: number; status?: string }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { vendorId };
    if (filters.status) {
      where.status = filters.status;
    }

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          commissionEntries: {
            include: {
              booking: {
                select: { bookingNumber: true, totalAmount: true },
              },
            },
          },
        },
      }),
      prisma.payout.count({ where }),
    ]);

    return {
      payouts: payouts.map((p: any) => ({
        id: p.id,
        amount: p.amount.toNumber(),
        status: p.status,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
        commissionEntries: p.commissionEntries.map((c: any) => ({
          id: c.id,
          commissionAmount: c.commissionAmount.toNumber(),
          vendorEarning: c.vendorEarning.toNumber(),
          bookingNumber: c.booking?.bookingNumber,
          bookingAmount: c.booking?.totalAmount?.toNumber(),
        })),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async blockInventoryDate(vendorId: string, data: { roomTypeId: string; date: string; reason?: string }) {
    // Verify the room belongs to one of vendor's properties
    const room = await prisma.room.findFirst({
      where: {
        id: data.roomTypeId,
        property: { vendorId },
      },
    });

    if (!room) {
      const error = new Error('Room not found or not owned by vendor');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const date = toStartOfDayUtc(data.date);

    const inventoryDay = await prisma.inventoryDay.upsert({
      where: {
        roomId_date: {
          roomId: data.roomTypeId,
          date,
        },
      },
      create: {
        roomId: data.roomTypeId,
        date,
        totalRooms: room.totalRooms,
        availableRooms: 0,
      },
      update: {
        availableRooms: 0,
      },
    });

    logger.info({ vendorId, roomId: data.roomTypeId, date: data.date }, 'Vendor blocked inventory date');

    return inventoryDay;
  }

  async unblockInventoryDate(vendorId: string, data: { roomTypeId: string; date: string }) {
    const room = await prisma.room.findFirst({
      where: {
        id: data.roomTypeId,
        property: { vendorId },
      },
    });

    if (!room) {
      const error = new Error('Room not found or not owned by vendor');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const date = toStartOfDayUtc(data.date);

    const inventoryDay = await prisma.inventoryDay.upsert({
      where: {
        roomId_date: {
          roomId: data.roomTypeId,
          date,
        },
      },
      create: {
        roomId: data.roomTypeId,
        date,
        totalRooms: room.totalRooms,
        availableRooms: room.totalRooms,
      },
      update: {
        availableRooms: room.totalRooms,
      },
    });

    logger.info({ vendorId, roomId: data.roomTypeId, date: data.date }, 'Vendor unblocked inventory date');

    return inventoryDay;
  }

  async blockInventoryDates(vendorId: string, data: {
    roomId?: string;
    propertyId?: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    const where: any = { property: { vendorId } };
    if (data.roomId) {
      where.id = data.roomId;
    } else if (data.propertyId) {
      where.propertyId = data.propertyId;
    } else {
      const error = new Error('Either roomId or propertyId is required');
      (error as any).code = ERROR_CODES.VALIDATION_ERROR;
      throw error;
    }

    const rooms = await prisma.room.findMany({ where });

    if (rooms.length === 0) {
      const error = new Error('No rooms found for vendor');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const start = toStartOfDayUtc(data.startDate);
    const end = toStartOfDayUtc(data.endDate);
    const dates: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    const results = await prisma.$transaction(async (tx) => {
      const upserts = [];
      for (const room of rooms) {
        for (const date of dates) {
          upserts.push(
            tx.inventoryDay.upsert({
              where: {
                roomId_date: {
                  roomId: room.id,
                  date,
                },
              },
              create: {
                roomId: room.id,
                date,
                totalRooms: room.totalRooms,
                availableRooms: 0,
              },
              update: {
                availableRooms: 0,
              },
            })
          );
        }
      }
      return Promise.all(upserts);
    });

    logger.info(
      { vendorId, roomCount: rooms.length, dateCount: dates.length },
      'Vendor blocked inventory date range'
    );

    return { blockedCount: results.length };
  }

  async getAllVendors(filters: {
    page?: number;
    limit?: number;
    isApproved?: boolean;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.isApproved !== undefined) {
      where.isApproved = filters.isApproved;
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
          },
          _count: { select: { properties: true } },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    return {
      vendors: vendors.map((v: any) => ({
        id: v.id,
        businessName: v.businessName,
        businessAddress: v.businessAddress,
        gstNumber: v.gstNumber,
        isApproved: v.isApproved,
        approvedAt: v.approvedAt,
        commissionRate: v.commissionRate.toNumber(),
        propertiesCount: v._count.properties,
        user: v.user,
        createdAt: v.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveVendor(vendorId: string, adminId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: true },
    });

    if (!vendor) {
      const error = new Error('Vendor not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        isApproved: true,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    logger.info({ vendorId, adminId }, 'Vendor approved');

    await notificationsService.create({
      userId: vendor.userId,
      type: 'VENDOR_APPROVED',
      title: 'Vendor Account Approved',
      message: `Your vendor account "${vendor.businessName}" has been approved. You can now list your properties.`,
      data: { vendorId: vendor.id },
    });

    await webPushService.sendNotification(vendor.userId, {
      title: 'Vendor Account Approved',
      body: `Your vendor account "${vendor.businessName}" has been approved. You can now list your properties.`,
      tag: 'vendor-approved',
      data: { vendorId: vendor.id },
    });

    return {
      id: updated.id,
      isApproved: updated.isApproved,
      approvedAt: updated.approvedAt,
    };
  }

  async adminCreateOnboarding(data: AdminCreateVendorOnboardingInput, adminId: string) {
    const {
      account,
      businessInfo,
      payout,
      hotel,
      rooms,
      inventory,
      adminControls,
    } = data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: account.email }, { phone: account.phoneNumber }],
      },
      select: { id: true },
    });

    if (existingUser) {
      const error = new Error('Vendor account already exists with this email or phone');
      (error as any).code = ERROR_CODES.RESOURCE_CONFLICT;
      throw error;
    }

    const existingProperty = await prisma.property.findUnique({
      where: { slug: hotel.slug },
      select: { id: true },
    });

    if (existingProperty) {
      const error = new Error('Hotel slug already exists');
      (error as any).code = ERROR_CODES.RESOURCE_CONFLICT;
      throw error;
    }

    const normalizedImages = hotel.images.map((image, index) => ({
      url: image.url,
      alt: image.alt || hotel.hotelName,
      isPrimary: image.isPrimary ?? index === 0,
    }));

    if (!normalizedImages.some((image) => image.isPrimary)) {
      normalizedImages[0].isPrimary = true;
    }

    const totalRoomCapacity = rooms.reduce((sum, room) => sum + room.totalRooms, 0);
    if (inventory.totalRoomsAvailable > totalRoomCapacity) {
      const error = new Error('Total rooms available cannot exceed sum of room inventories');
      (error as any).code = ERROR_CODES.VALIDATION_ERROR;
      throw error;
    }

    const blockDates = inventory.blockDates ?? [];

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: account.fullName,
          email: account.email,
          phone: account.phoneNumber,
          passwordHash: await hashPassword(account.password),
          role: 'VENDOR',
          isActive: !(adminControls?.suspensionStatus ?? false),
        },
      });

      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          businessName: account.businessName,
          businessAddress: businessInfo.businessAddress,
          gstNumber: businessInfo.gstNumber,
          panNumber: businessInfo.panNumber,
          bankAccount: {
            bankName: payout.bankName,
            accountHolderName: payout.accountHolderName,
            accountNumber: payout.accountNumber,
            ifscCode: payout.ifscCode,
            upiId: payout.upiId,
          },
          commissionRate: new Prisma.Decimal(adminControls?.commissionRate ?? 10),
          isApproved: adminControls?.vendorApproved ?? false,
          approvedBy: (adminControls?.vendorApproved ?? false) ? adminId : null,
          approvedAt: (adminControls?.vendorApproved ?? false) ? new Date() : null,
        },
      });

      const property = await tx.property.create({
        data: {
          vendorId: vendor.id,
          type: 'HOTEL',
          status: adminControls?.approvalStatus ?? 'PENDING',
          name: hotel.hotelName,
          slug: hotel.slug,
          description: hotel.description,
          shortDesc: hotel.shortDescription,
          address: hotel.fullAddress,
          city: businessInfo.city,
          state: businessInfo.state,
          pincode: businessInfo.pincode,
          latitude: new Prisma.Decimal(hotel.latitude),
          longitude: new Prisma.Decimal(hotel.longitude),
          images: normalizedImages,
          videos: hotel.videos,
          amenities: hotel.amenities,
          highlights: hotel.highlights ?? [],
          basePrice: new Prisma.Decimal(hotel.basePrice),
        },
      });

      const createdRooms = [] as Array<{ id: string; name: string }>;
      for (const room of rooms) {
        const createdRoom = await tx.room.create({
          data: {
            propertyId: property.id,
            name: room.roomName,
            type: room.roomName.toLowerCase().replace(/\s+/g, '-'),
            capacity: room.capacity,
            extraBedCapacity: room.extraBedCapacity,
            pricePerNight: new Prisma.Decimal(room.pricePerNight),
            weekendPrice: room.weekendPrice ? new Prisma.Decimal(room.weekendPrice) : null,
            amenities: room.roomAmenities,
            images: room.roomImages,
            totalRooms: room.totalRooms,
            availableRooms: room.totalRooms,
          },
        });

        createdRooms.push({ id: createdRoom.id, name: createdRoom.name });

        for (const blocked of blockDates) {
          const blockedRooms = Math.min(
            blocked.blockedRooms ?? room.totalRooms,
            room.totalRooms,
          );

          await tx.inventoryDay.upsert({
            where: {
              roomId_date: {
                roomId: createdRoom.id,
                date: toStartOfDayUtc(blocked.date),
              },
            },
            create: {
              roomId: createdRoom.id,
              date: toStartOfDayUtc(blocked.date),
              totalRooms: room.totalRooms,
              availableRooms: Math.max(0, room.totalRooms - blockedRooms),
            },
            update: {
              totalRooms: room.totalRooms,
              availableRooms: Math.max(0, room.totalRooms - blockedRooms),
            },
          });
        }
      }

      return {
        user,
        vendor,
        property,
        rooms: createdRooms,
      };
    });

    logger.info(
      {
        adminId,
        vendorId: created.vendor.id,
        propertyId: created.property.id,
        roomCount: created.rooms.length,
      },
      'Admin created vendor onboarding package',
    );

    return {
      vendor: {
        id: created.vendor.id,
        businessName: created.vendor.businessName,
        isApproved: created.vendor.isApproved,
        commissionRate: created.vendor.commissionRate.toNumber(),
      },
      account: {
        userId: created.user.id,
        email: created.user.email,
        phone: created.user.phone,
      },
      hotel: {
        propertyId: created.property.id,
        name: created.property.name,
        slug: created.property.slug,
        status: created.property.status,
      },
      rooms: created.rooms,
    };
  }
}

export const vendorService = new VendorService();
export default vendorService;
