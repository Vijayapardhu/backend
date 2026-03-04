import prisma from '../../config/database';
import { logger } from '../../utils/logger.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { Prisma } from '@prisma/client';
import type { PlatformSettingsInput } from './admin-settings.schema';

const DEFAULT_HOMEPAGE_CONFIG = {
  sections: {
    banner: { isVisible: true, order: 0 },
    hero: { isVisible: true, order: 1 },
    features: { isVisible: true, order: 2 },
    destinations: { isVisible: true, order: 3 },
    recommendations: { isVisible: true, order: 4 },
    temples: { isVisible: true, order: 5 },
    services: { isVisible: true, order: 6 },
    becomePartner: { isVisible: true, order: 7 },
  },
  bannerSlides: [
    { id: '1', title: 'Planning a Weekend\nGetaway?', subtitle: 'Discover Premium Hotels', tags: '· Luxury · Comfort · Service', ctaText: 'Explore Hotels', ctaLink: '/hotels', imageUrl: '', isActive: true },
    { id: '2', title: 'Looking for a\nCozy Stay?', subtitle: 'Find Perfect Homes', tags: '· Spacious · Homely · Affordable', ctaText: 'Browse Homes', ctaLink: '/homes', imageUrl: '', isActive: true },
    { id: '3', title: 'Planning a Weekend\nDeviation?', subtitle: 'Discover Sacred Temples', tags: '· Yaganti · Mahanandi · Ahobilam', ctaText: 'Know the route', ctaLink: '/deviation-temples', imageUrl: '', isActive: true },
  ],
  destinations: [
    { id: '1', name: 'Nandyala', imageUrl: '', link: '/hotels?destination=nandyala', isActive: true },
    { id: '2', name: 'Vijayawada', imageUrl: '', link: '/hotels?destination=vijayawada', isActive: true },
    { id: '3', name: 'Vetapalem', imageUrl: '', link: '/hotels?destination=vetapalem', isActive: true },
  ],
  featureCards: [
    { id: '1', icon: 'clock', title: '24 Hour Check-In', description: 'Instant access to your stay, anytime', badge: 'Fast Resolution', isActive: true },
    { id: '2', icon: 'settings', title: 'Customizable Rooms', description: 'Tailor your stay to your needs', badge: '', link: '/contact', isActive: true },
    { id: '3', icon: 'refresh', title: 'Instant Refund', description: 'Fast and hassle-free refunds', badge: '59 Second Response', isActive: true },
  ],
  serviceCards: [
    { id: '1', icon: 'car', title: 'Car Rental', description: 'Explore Andhra Pradesh with our reliable car rental service', link: '/services#car-rental', isActive: true },
    { id: '2', icon: 'bike', title: 'Bike Rental', description: 'Two-wheelers for quick and easy local travel', link: '/services#bike-rental', isActive: true },
    { id: '3', icon: 'wrench', title: 'Car Services', description: 'Professional car maintenance and repair services', link: '/services#car-services', isActive: true },
  ],
  temples: [
    { id: '1', name: 'Kanaka Durga Temple', location: 'Vijayawada', imageUrl: '', link: '/temples/kanaka-durga', isActive: true },
    { id: '2', name: 'Mahanandi Temple', location: 'Nandyala', imageUrl: '', link: '/temples/mahanandi', isActive: true },
    { id: '3', name: 'Sri Venkateswara Temple', location: 'Tirupati', imageUrl: '', link: '/temples/tirumala', isActive: true },
  ],
  partnerSection: {
    title: 'Are you a property owner?',
    subtitle: 'List your property on HostHaven and start earning today',
    ctaText: 'Become a Partner',
    ctaLink: '/vendor/signup',
  },
};

export class AdminService {
  async getPlatformSettings() {
    const settings = await prisma.platformSetting.findFirst();

    if (!settings) {
      const created = await prisma.platformSetting.create({
        data: {
          platformName: 'HostHaven',
          commissionRate: new Prisma.Decimal(15),
          supportEmail: 'support@hosthaven.com',
          supportPhone: '+91 1800 123 4567',
          emailNotifications: true,
          pushNotifications: true,
          minPayoutAmount: new Prisma.Decimal(1000),
          payoutFrequency: 'WEEKLY',
          emailTemplates: [],
          featureFlags: [],
        },
      });

      return {
        ...created,
        commissionRate: created.commissionRate.toNumber(),
        minPayoutAmount: created.minPayoutAmount.toNumber(),
      };
    }

    return {
      ...settings,
      commissionRate: settings.commissionRate.toNumber(),
      minPayoutAmount: settings.minPayoutAmount.toNumber(),
    };
  }

  async updatePlatformSettings(data: PlatformSettingsInput) {
    const existing = await prisma.platformSetting.findFirst();

    const payload = {
      platformName: data.platformName,
      commissionRate: new Prisma.Decimal(data.commissionRate),
      supportEmail: data.supportEmail,
      supportPhone: data.supportPhone,
      emailNotifications: data.emailNotifications,
      pushNotifications: data.pushNotifications,
      minPayoutAmount: new Prisma.Decimal(data.minPayoutAmount),
      payoutFrequency: data.payoutFrequency,
      emailTemplates: data.emailTemplates ?? [],
      featureFlags: data.featureFlags ?? [],
    };

    const updated = existing
      ? await prisma.platformSetting.update({
        where: { id: existing.id },
        data: payload,
      })
      : await prisma.platformSetting.create({ data: payload });

    logger.info({ settingsId: updated.id }, 'Platform settings updated');

    return {
      ...updated,
      commissionRate: updated.commissionRate.toNumber(),
      minPayoutAmount: updated.minPayoutAmount.toNumber(),
    };
  }

  async getHomepageConfig() {
    try {
      const settings = await prisma.platformSetting.findFirst({
        select: { homepageConfig: true },
      });
      return settings?.homepageConfig ?? DEFAULT_HOMEPAGE_CONFIG;
    } catch {
      return DEFAULT_HOMEPAGE_CONFIG;
    }
  }

  async updateHomepageConfig(config: Record<string, unknown>) {
    let existing = await prisma.platformSetting.findFirst();
    if (!existing) {
      existing = await prisma.platformSetting.create({
        data: {
          platformName: 'HostHaven',
          commissionRate: new Prisma.Decimal(15),
          supportEmail: 'support@hosthaven.com',
          supportPhone: '+91 1800 123 4567',
          emailNotifications: true,
          pushNotifications: true,
          minPayoutAmount: new Prisma.Decimal(1000),
          payoutFrequency: 'WEEKLY',
          emailTemplates: [],
          featureFlags: [],
          homepageConfig: config as Prisma.InputJsonValue,
        },
      });
      logger.info({ settingsId: existing.id }, 'Homepage config created with new platform settings');
      return existing.homepageConfig;
    }
    try {
      const updated = await prisma.platformSetting.update({
        where: { id: existing.id },
        data: { homepageConfig: config as Prisma.InputJsonValue },
      });
      logger.info({ settingsId: updated.id }, 'Homepage config updated');
      return updated.homepageConfig;
    } catch (err: any) {
      if (err.message?.includes('homepageConfig')) {
        const error = new Error('homepageConfig column not found. Run: npx prisma db push');
        (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
        throw error;
      }
      throw err;
    }
  }

  async getDashboard() {
    const [
      totalUsers,
      totalProperties,
      totalBookings,
      totalRevenue,
      recentBookings,
      recentVendors,
      pendingProperties,
      activeProperties,
      totalVendors,
      pendingVendors,
      totalServiceBookings,
      totalSupportTickets,
      openTickets,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.booking.count(),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          property: { select: { name: true, type: true } },
        },
      }),
      prisma.vendor.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.property.count({ where: { status: 'PENDING' } }),
      prisma.property.count({ where: { status: 'ACTIVE' } }),
      prisma.vendor.count(),
      prisma.vendor.count({ where: { isApproved: false } }),
      prisma.serviceBooking.count(),
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);

    const newBookingsToday = await prisma.booking.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    return {
      stats: {
        totalUsers,
        totalProperties,
        activeProperties,
        totalBookings,
        totalRevenue: totalRevenue._sum.amount?.toNumber() || 0,
        pendingProperties,
        pendingVendors,
        totalVendors,
        totalServiceBookings,
        totalSupportTickets,
        openTickets,
        newBookingsToday,
      },
      recentBookings: recentBookings.map((b: any) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        user: b.user,
        property: b.property,
        totalAmount: b.totalAmount.toNumber(),
        status: b.status,
        createdAt: b.createdAt,
      })),
      recentVendors: recentVendors.map((v: any) => ({
        id: v.id,
        businessName: v.businessName,
        user: v.user,
        isApproved: v.isApproved,
        createdAt: v.createdAt,
      })),
    };
  }

  async getSystemStats(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [users, properties, bookings, revenue] = await Promise.all([
      prisma.user.count({ where }),
      prisma.property.count({ where }),
      prisma.booking.count({ where }),
      prisma.payment.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    const bookingStats = await prisma.booking.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const propertyTypes = await prisma.property.groupBy({
      by: ['type'],
      where: { status: 'ACTIVE' },
      _count: { id: true },
    });

    return {
      users,
      properties,
      bookings,
      revenue: revenue._sum.amount?.toNumber() || 0,
      byStatus: bookingStats.reduce((acc: any, s: any) => {
        acc[s.status] = s._count.id;
        return acc;
      }, {}),
      byPropertyType: propertyTypes.reduce((acc: any, p: any) => {
        acc[p.type] = p._count.id;
        return acc;
      }, {}),
    };
  }

  async getAllUsers(filters: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    status?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      if (filters.status === 'active') {
        where.isActive = true;
        where.isDeleted = false;
      } else if (filters.status === 'suspended') {
        where.isActive = false;
        where.isDeleted = false;
      } else if (filters.status === 'deleted') {
        where.isDeleted = true;
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          isDeleted: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      const error = new Error('User not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    logger.info({ userId, isActive }, 'User status updated');

    return {
      id: updated.id,
      isActive: updated.isActive,
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true, role: true,
        isActive: true, isVerified: true, emailVerifiedAt: true,
        isDeleted: true, deletedAt: true,
        lastLoginAt: true, lastLoginIp: true,
        avatarUrl: true, createdAt: true, updatedAt: true,
        bookings: {
          orderBy: { createdAt: 'desc' }, take: 20,
          select: {
            id: true, checkInDate: true, checkOutDate: true, status: true,
            totalAmount: true, createdAt: true,
            property: { select: { id: true, name: true, type: true } },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' }, take: 20,
          select: {
            id: true, rating: true, comment: true, createdAt: true,
            property: { select: { id: true, name: true } },
          },
        },
        serviceBookings: {
          orderBy: { createdAt: 'desc' }, take: 20,
          select: {
            id: true, status: true, serviceDate: true, totalAmount: true,
            service: { select: { id: true, name: true } },
          },
        },
        wishlistItems: { select: { id: true } },
        _count: { select: { bookings: true, reviews: true, serviceBookings: true, wishlistItems: true } },
      },
    });
    if (!user) {
      const error = new Error('User not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    const totalSpent = await prisma.booking.aggregate({
      where: { userId, status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] } },
      _sum: { totalAmount: true },
    });
    return { ...user, totalSpent: totalSpent._sum.totalAmount ?? 0 };
  }

  async softDeleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const error = new Error('User not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false },
    });
    logger.info({ userId }, 'User soft-deleted');
    return { id: updated.id, isDeleted: true };
  }

  async verifyUserEmail(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const error = new Error('User not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, emailVerifiedAt: new Date(), emailVerificationToken: null },
    });
    logger.info({ userId }, 'User email verified by admin');
    return { id: updated.id, isVerified: true };
  }

  async resetUserPassword(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const error = new Error('User not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    // Generate a temporary token — in production this should send an email
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await prisma.user.update({
      where: { id: userId },
      data: { passwordResetToken: resetToken, passwordResetExpires: expires },
    });
    logger.info({ userId }, 'Password reset initiated by admin');
    return { id: userId, resetToken, expiresAt: expires };
  }

  async getUserSessions(userId: string) {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, userAgent: true, ipAddress: true, deviceType: true,
        location: true, isActive: true, expiresAt: true, createdAt: true,
      },
    });
    return sessions;
  }

  async getAllProperties(filters: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
    vendorId?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Default hiding soft-deleted
    if (where.isDeleted === undefined && where.status !== 'INACTIVE') {
      where.isDeleted = false;
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
          _count: { select: { bookings: true, reviews: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return {
      properties: properties.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        status: p.status,
        city: p.state,
        basePrice: p.basePrice.toNumber(),
        rating: p.rating.toNumber(),
        reviewCount: p.reviewCount,
        bookingsCount: p._count.bookings,
        vendor: p.vendor,
        createdAt: p.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updatePropertyStatus(propertyId: string, status: string, reason?: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });

    if (!property) {
      const error = new Error('Property not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: { status: status as any },
    });

    logger.info({ propertyId, status }, 'Property status updated');

    return {
      id: updated.id,
      status: updated.status,
    };
  }

  async createProperty(data: any) {
    const slug = (data.slug || data.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') + '-' + Date.now()

    const property = await prisma.property.create({
      data: {
        name: data.name,
        slug,
        type: data.type || 'HOTEL',
        status: data.status || 'DRAFT',
        description: data.description,
        shortDesc: data.shortDesc || undefined,
        address: data.address,
        city: data.city || 'VIJAYAWADA',
        state: data.state || 'Andhra Pradesh',
        pincode: data.pincode,
        latitude: data.latitude ? new Prisma.Decimal(data.latitude) : undefined,
        longitude: data.longitude ? new Prisma.Decimal(data.longitude) : undefined,
        basePrice: new Prisma.Decimal(data.basePrice || 0),
        amenities: data.amenities || [],
        images: data.images || [],
        videos: data.videos || undefined,
        highlights: data.highlights || undefined,
        featureFlags: data.houseDetails ? data.houseDetails : undefined,
      },
    });

    // Auto-create a default Room for HOME type so pricing/inventory works
    if (data.type === 'HOME') {
      const hd = data.houseDetails || {};
      await prisma.room.create({
        data: {
          propertyId: property.id,
          name: hd.houseType || 'Entire Home',
          type: hd.listingType || 'entire_home',
          description: data.description?.slice(0, 200),
          capacity: Number(hd.totalGuests) || 4,
          pricePerNight: new Prisma.Decimal(data.basePrice || 0),
          weekendPrice: hd.weekendPrice ? new Prisma.Decimal(hd.weekendPrice) : undefined,
          amenities: data.amenities || [],
          totalRooms: Number(hd.totalUnits) || 1,
          availableRooms: Number(hd.totalUnits) || 1,
        },
      });
    }

    // Create cancellation policy if provided
    if (data.cancellationPolicy) {
      const policyMap: Record<string, { freeBeforeHours: number; refundPercentBefore: number; refundPercentAfter: number }> = {
        FREE_CANCELLATION: { freeBeforeHours: 24, refundPercentBefore: 100, refundPercentAfter: 0 },
        MODERATE: { freeBeforeHours: 48, refundPercentBefore: 100, refundPercentAfter: 50 },
        STRICT: { freeBeforeHours: 72, refundPercentBefore: 100, refundPercentAfter: 0 },
        NON_REFUNDABLE: { freeBeforeHours: 0, refundPercentBefore: 0, refundPercentAfter: 0 },
      };
      const policy = policyMap[data.cancellationPolicy] || policyMap['FREE_CANCELLATION'];
      await prisma.cancellationPolicy.create({
        data: {
          propertyId: property.id,
          freeBeforeHours: policy.freeBeforeHours,
          refundPercentBefore: new Prisma.Decimal(policy.refundPercentBefore),
          refundPercentAfter: new Prisma.Decimal(policy.refundPercentAfter),
        },
      });
    }

    logger.info({ propertyId: property.id, type: data.type }, 'Property created by admin');

    return {
      id: property.id,
      name: property.name,
      slug: property.slug,
      status: property.status,
    };
  }

  async getPropertyById(propertyId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId, isDeleted: false },
      include: {
        vendor: {
          select: { id: true, businessName: true, user: { select: { name: true, email: true, phone: true } } }
        },
        rooms: {
          where: { isDeleted: false }
        },
        cancellationPolicy: true,
        _count: { select: { bookings: true, reviews: true } }
      }
    });

    if (!property) {
      const error: any = new Error('Property not found');
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    return {
      ...property,
      basePrice: property.basePrice.toNumber(),
      rating: property.rating.toNumber()
    };
  }

  async updateProperty(propertyId: string, data: any) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      const error: any = new Error('Property not found');
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDesc !== undefined) updateData.shortDesc = data.shortDesc;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.pincode !== undefined) updateData.pincode = data.pincode;
    if (data.latitude !== undefined) updateData.latitude = data.latitude ? new Prisma.Decimal(data.latitude) : null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude ? new Prisma.Decimal(data.longitude) : null;
    if (data.basePrice !== undefined) updateData.basePrice = new Prisma.Decimal(data.basePrice);
    if (data.amenities !== undefined) updateData.amenities = data.amenities;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.videos !== undefined) updateData.videos = data.videos;
    if (data.highlights !== undefined) updateData.highlights = data.highlights;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.featureFlags !== undefined) updateData.featureFlags = data.featureFlags;
    if (data.houseDetails !== undefined) updateData.featureFlags = data.houseDetails;

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: updateData
    });

    // Upsert cancellation policy if provided
    if (data.cancellationPolicy) {
      const policyMap: Record<string, { freeBeforeHours: number; refundPercentBefore: number; refundPercentAfter: number }> = {
        FREE_CANCELLATION: { freeBeforeHours: 24, refundPercentBefore: 100, refundPercentAfter: 0 },
        MODERATE: { freeBeforeHours: 48, refundPercentBefore: 100, refundPercentAfter: 50 },
        STRICT: { freeBeforeHours: 72, refundPercentBefore: 100, refundPercentAfter: 0 },
        NON_REFUNDABLE: { freeBeforeHours: 0, refundPercentBefore: 0, refundPercentAfter: 0 },
      };
      const policy = policyMap[data.cancellationPolicy] || policyMap['FREE_CANCELLATION'];
      await prisma.cancellationPolicy.upsert({
        where: { propertyId },
        create: {
          propertyId,
          freeBeforeHours: policy.freeBeforeHours,
          refundPercentBefore: new Prisma.Decimal(policy.refundPercentBefore),
          refundPercentAfter: new Prisma.Decimal(policy.refundPercentAfter),
        },
        update: {
          freeBeforeHours: policy.freeBeforeHours,
          refundPercentBefore: new Prisma.Decimal(policy.refundPercentBefore),
          refundPercentAfter: new Prisma.Decimal(policy.refundPercentAfter),
        },
      });
    }

    logger.info({ propertyId }, 'Property updated by admin');
    return updated;
  }

  async softDeleteProperty(propertyId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      const error: any = new Error('Property not found');
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    await prisma.property.update({
      where: { id: propertyId },
      data: { isDeleted: true, deletedAt: new Date(), status: 'INACTIVE' }
    });

    logger.info({ propertyId }, 'Property soft deleted by admin');
    return { id: propertyId, isDeleted: true };
  }

  async updateVendorStatus(vendorId: string, status: string, reason?: string) {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });

    if (!vendor) {
      const error = new Error('Vendor not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updateData: any = {};
    if (status === 'APPROVED') {
      updateData.isApproved = true;
      updateData.approvedAt = new Date();
    } else if (status === 'REJECTED' || status === 'SUSPENDED') {
      updateData.isApproved = false;
    }

    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: updateData,
    });

    logger.info({ vendorId, status }, 'Vendor status updated');

    return {
      id: updated.id,
      isApproved: updated.isApproved,
      approvedAt: updated.approvedAt,
    };
  }

  async updateVendorCommission(vendorId: string, commissionRate: number) {
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
      data: {
        commissionRate: new Prisma.Decimal(commissionRate),
      },
    });

    logger.info({ vendorId, commissionRate }, 'Vendor commission updated');

    return {
      id: updated.id,
      commissionRate: updated.commissionRate,
    };
  }

  async updateVendor(vendorId: string, data: any) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: true },
    });

    if (!vendor) {
      const error = new Error('Vendor not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updateVendorData: any = {};
    if (data.businessName !== undefined) updateVendorData.businessName = data.businessName;
    if (data.businessAddress !== undefined) updateVendorData.businessAddress = data.businessAddress;
    if (data.gstNumber !== undefined) updateVendorData.gstNumber = data.gstNumber;
    if (data.panNumber !== undefined) updateVendorData.panNumber = data.panNumber;
    if (data.aadhaarNumber !== undefined) updateVendorData.aadhaarNumber = data.aadhaarNumber;
    if (data.passportPhoto !== undefined) updateVendorData.passportPhoto = data.passportPhoto;
    if (data.companyLogo !== undefined) updateVendorData.companyLogo = data.companyLogo;
    if (data.commissionRate !== undefined) updateVendorData.commissionRate = new Prisma.Decimal(data.commissionRate);
    if (data.bankAccount !== undefined) updateVendorData.bankAccount = data.bankAccount;

    const updateUserPayload: any = {};
    if (data.name !== undefined) updateUserPayload.name = data.name;
    if (data.email !== undefined) updateUserPayload.email = data.email;
    if (data.phone !== undefined) updateUserPayload.phone = data.phone;

    const result = await prisma.$transaction(async (tx) => {
      if (Object.keys(updateUserPayload).length > 0) {
        await tx.user.update({
          where: { id: vendor.userId },
          data: updateUserPayload,
        });
      }

      let updatedVendor = vendor;
      if (Object.keys(updateVendorData).length > 0) {
        updatedVendor = await tx.vendor.update({
          where: { id: vendorId },
          data: updateVendorData,
          include: { user: true },
        });
      }
      return updatedVendor;
    });

    logger.info({ vendorId }, 'Vendor details completely updated by admin');

    return result;
  }

  async getAllBookings(filters: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    vendorId?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.checkInDate = {};
      if (filters.startDate) where.checkInDate.gte = filters.startDate;
      if (filters.endDate) where.checkInDate.lte = filters.endDate;
    }

    if (filters.vendorId) {
      where.property = { vendorId: filters.vendorId };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          property: { select: { id: true, name: true, type: true, city: true } },
          room: { select: { id: true, name: true } },
          payment: { select: { status: true, amount: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings.map((b: any) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        user: b.user,
        property: b.property,
        room: b.room,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        totalAmount: b.totalAmount.toNumber(),
        status: b.status,
        paymentStatus: b.payment?.status,
        createdAt: b.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Booking detail, status override, and logs
  async getBookingById(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        property: { select: { id: true, name: true, type: true, city: true, address: true } },
        room: { select: { id: true, name: true, type: true } },
        payment: true,
      },
    });

    if (!booking) {
      const error: any = new Error("Booking not found");
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    // Formatting bigints and decimals
    return {
      ...booking,
      totalAmount: booking.totalAmount.toString(),
      baseAmount: booking.baseAmount.toString(),
      taxAmount: booking.taxAmount.toString(),
      discountAmount: booking.discountAmount.toString(),
      payment: (booking as any).payment ? {
        ...(booking as any).payment,
        amount: (booking as any).payment.amount.toString(),
      } : null,
    };
  }

  async updateBookingStatus(bookingId: string, status: string) {
    const validStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      const error: any = new Error("Invalid booking status");
      error.code = ERROR_CODES.VALIDATION_ERROR;
      throw error;
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      const error: any = new Error("Booking not found");
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const data: any = { status };
    if (status === 'CANCELLED') {
      data.cancelledAt = new Date();
      data.cancelledBy = 'ADMIN';
      data.cancellationReason = 'Cancelled by Admin';
    } else if (status === 'CHECKED_IN') {
      data.actualCheckIn = new Date();
    } else if (status === 'CHECKED_OUT') {
      data.actualCheckOut = new Date();
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data,
    });
    return updated;
  }

  async getPaymentDetails(bookingId: string) {
    const payment = await prisma.payment.findUnique({
      where: { bookingId },
    });

    if (!payment) {
      const error: any = new Error("Payment not found for this booking");
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    return {
      ...payment,
      amount: payment.amount.toString(),
    };
  }

  async getAllVendors(filters: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status === 'PENDING') {
      where.isApproved = false;
    } else if (filters.status === 'APPROVED') {
      where.isApproved = true;
    }

    if (filters.search) {
      where.OR = [
        { businessName: { contains: filters.search, mode: 'insensitive' } },
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          properties: { select: { id: true, name: true, status: true } },
          _count: { select: { properties: true } },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    return {
      vendors: vendors.map((v: any) => ({
        id: v.id,
        businessName: v.businessName,
        email: v.user?.email,
        phone: v.phone,
        isApproved: v.isApproved,
        approvedAt: v.approvedAt,
        propertiesCount: v._count.properties,
        properties: v.properties,
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

  async getVendorById(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        properties: { select: { id: true, name: true, type: true, status: true, city: true } },
        payouts: { select: { id: true, amount: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { properties: true, payouts: true } },
      },
    });

    if (!vendor) {
      const error: any = new Error('Vendor not found');
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const totalEarnings = await prisma.payout.aggregate({
      where: { vendorId, status: 'PAID' },
      _sum: { amount: true },
    });

    return {
      ...vendor,
      commissionRate: vendor.commissionRate.toString(),
      totalEarnings: totalEarnings._sum.amount ? totalEarnings._sum.amount.toString() : '0',
    };
  }

  async softDeleteVendor(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      const error: any = new Error('Vendor not found');
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    // Rather than true physical deletion, we mark user context as soft-deleted + vendor disapproved.
    // If the schema requires an explicit isDeleted flag, ensure you add one to Prisma schema later.
    // However typically vendor suspension acts as soft-deletion effectively if we also softly delete their owner `user`.

    await prisma.$transaction(async (tx) => {
      await tx.vendor.update({
        where: { id: vendorId },
        data: { isApproved: false }
      });

      if (vendor.userId) {
        await tx.user.update({
          where: { id: vendor.userId },
          data: { isDeleted: true, deletedAt: new Date(), isActive: false }
        });
      }
    });

    logger.info({ vendorId }, 'Vendor soft-deleted successfully');

    return { id: vendorId, isDeleted: true };
  }

  async getAllPayouts(filters: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      prisma.payout.count({ where }),
    ]);

    return {
      payouts: payouts.map((p: any) => ({
        id: p.id,
        vendor: p.vendor,
        amount: p.amount.toNumber(),
        status: p.status,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        processedAt: p.processedAt,
        transactionId: p.transactionId,
        createdAt: p.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllPayments(filters: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { razorpayPaymentId: { contains: filters.search, mode: 'insensitive' } },
        { razorpayOrderId: { contains: filters.search, mode: 'insensitive' } },
        { booking: { bookingNumber: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              property: { select: { name: true } },
              user: { select: { name: true, email: true } },
            },
          },
          refunds: true,
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments: payments.map((p: any) => ({
        id: p.id,
        amount: p.amount.toNumber(),
        currency: p.currency,
        status: p.status,
        method: p.method,
        razorpayPaymentId: p.razorpayPaymentId,
        razorpayOrderId: p.razorpayOrderId,
        bookingId: p.booking?.id,
        bookingNumber: p.booking?.bookingNumber,
        propertyName: p.booking?.property?.name,
        user: p.booking?.user,
        refunds: p.refunds.map((r: any) => ({ ...r, amount: r.amount.toNumber() })),
        createdAt: p.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllRefunds(filters: {
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payment: {
            include: {
              booking: {
                select: {
                  bookingNumber: true,
                  property: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.refund.count(),
    ]);

    return {
      refunds: refunds.map((r: any) => ({
        id: r.id,
        paymentId: r.paymentId,
        amount: r.amount.toNumber(),
        reason: r.reason,
        status: r.status,
        razorpayRefundId: r.razorpayRefundId,
        bookingNumber: r.payment?.booking?.bookingNumber,
        propertyName: r.payment?.booking?.property?.name,
        createdAt: r.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async processPayout(payoutId: string, action: 'approve' | 'reject', notes?: string) {
    const payout = await prisma.payout.findUnique({ where: { id: payoutId } });

    if (!payout) {
      const error = new Error('Payout not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    if (action === 'approve') {
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'completed',
          processedAt: new Date(),
          transactionId: `TXN-${Date.now()}`,
        },
      });
    } else {
      await prisma.payout.update({
        where: { id: payoutId },
        data: { status: 'rejected' },
      });
    }

    logger.info({ payoutId, action }, 'Payout processed');

    return { message: `Payout ${action}d successfully` };
  }

  async refundBooking(bookingId: string, amount?: number, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      const error = new Error('Booking not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    if (!booking.payment) {
      const error = new Error('Payment record not found for booking');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const refundAmount = amount ?? booking.payment.amount.toNumber();

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
        },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'REFUNDED',
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      }),
      prisma.refund.create({
        data: {
          paymentId: booking.payment.id,
          amount: new Prisma.Decimal(refundAmount),
          reason,
          status: 'processed',
        },
      }),
    ]);

    logger.info({ bookingId, refundAmount }, 'Booking refunded by admin');

    return {
      bookingId,
      message: 'Refund marked successfully',
    };
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) {
      const error = new Error('Payment not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const refundAmount = amount ?? payment.amount.toNumber();

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
        },
      }),
      ...(payment.booking ? [
        prisma.booking.update({
          where: { id: payment.booking.id },
          data: {
            status: 'REFUNDED',
            cancellationReason: reason,
            cancelledAt: new Date(),
          },
        })
      ] : []),
      prisma.refund.create({
        data: {
          paymentId: paymentId,
          amount: new Prisma.Decimal(refundAmount),
          reason,
          status: 'processed',
        },
      }),
    ]);

    logger.info({ paymentId, refundAmount }, 'Payment refunded by admin');

    return {
      paymentId,
      message: 'Refund processed successfully',
    };
  }

  async markPayoutPaid(payoutId: string, transactionId: string, notes?: string) {
    const payout = await prisma.payout.findUnique({ where: { id: payoutId } });

    if (!payout) {
      const error = new Error('Payout not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'paid',
        processedAt: new Date(),
        transactionId,
      },
    });

    logger.info({ payoutId, transactionId, notes }, 'Payout marked as paid by admin');

    return {
      id: updated.id,
      status: updated.status,
      transactionId: updated.transactionId,
      processedAt: updated.processedAt,
    };
  }

  async calculateCommission(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: { include: { vendor: true } } },
    });

    if (!booking || !booking.property.vendor) return;

    const vendor = booking.property.vendor;
    const commissionRate = vendor.commissionRate;
    const bookingAmount = booking.totalAmount;
    const commissionAmount = bookingAmount.mul(commissionRate).div(100);
    const vendorEarning = bookingAmount.sub(commissionAmount);

    await prisma.commissionLedger.upsert({
      where: { bookingId },
      update: {
        commissionRate,
        commissionAmount,
        vendorEarning,
        bookingAmount,
      },
      create: {
        bookingId,
        vendorId: vendor.id,
        bookingAmount,
        commissionRate,
        commissionAmount,
        vendorEarning,
      },
    });

    logger.info({ bookingId, vendorId: vendor.id }, 'Commission calculated');
  }

  async getVendorEarnings() {
    const vendors = await prisma.vendor.findMany({
      where: { isDeleted: false },
      include: {
        commissionLedger: {
          where: { payoutId: null },
        },
      },
    });

    return vendors.map((v: any) => {
      const unpaidEarnings = v.commissionLedger.reduce(
        (acc: Prisma.Decimal, entry: any) => acc.add(entry.vendorEarning),
        new Prisma.Decimal(0)
      );

      return {
        id: v.id,
        businessName: v.businessName,
        unpaidEarnings: unpaidEarnings.toNumber(),
        pendingEntriesCount: v.commissionLedger.length,
      };
    });
  }

  async createPayout(vendorId: string, amount?: number) {
    const unpaidEntries = await prisma.commissionLedger.findMany({
      where: { vendorId, payoutId: null },
    });

    if (unpaidEntries.length === 0) {
      const error = new Error('No unpaid earnings for this vendor');
      (error as any).code = ERROR_CODES.VALIDATION_ERROR;
      throw error;
    }

    const totalEarning = unpaidEntries.reduce(
      (acc, entry) => acc.add(entry.vendorEarning),
      new Prisma.Decimal(0)
    );

    const payoutAmount = amount ? new Prisma.Decimal(amount) : totalEarning;

    const payout = await prisma.payout.create({
      data: {
        vendorId,
        amount: payoutAmount,
        status: 'pending',
        bookingIds: unpaidEntries.map((e) => e.bookingId),
        periodStart: unpaidEntries[unpaidEntries.length - 1].createdAt,
        periodEnd: new Date(),
      },
    });

    await prisma.commissionLedger.updateMany({
      where: { id: { in: unpaidEntries.map((e) => e.id) } },
      data: { payoutId: payout.id },
    });

    logger.info({ vendorId, payoutId: payout.id }, 'Payout created');

    return payout;
  }

  async updateRoom(roomId: string, data: { pricePerNight?: number; weekendPrice?: number; totalRooms?: number; availableRooms?: number, isActive?: boolean }) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) {
      const error: any = new Error('Room not found');
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updateData: any = {};
    if (data.pricePerNight !== undefined) updateData.pricePerNight = new Prisma.Decimal(data.pricePerNight);
    if (data.weekendPrice !== undefined) updateData.weekendPrice = new Prisma.Decimal(data.weekendPrice);
    if (data.totalRooms !== undefined) updateData.totalRooms = data.totalRooms;

    // Safely constrain available rooms to not exceed total rooms
    if (data.availableRooms !== undefined) {
      updateData.availableRooms = Math.min(data.availableRooms, data.totalRooms ?? room.totalRooms);
    }

    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });

    logger.info({ roomId }, 'Room details updated securely by admin');

    return {
      id: updated.id,
      pricePerNight: updated.pricePerNight.toNumber(),
      weekendPrice: updated.weekendPrice ? updated.weekendPrice.toNumber() : null,
      totalRooms: updated.totalRooms,
      availableRooms: updated.availableRooms,
      isActive: updated.isActive,
      message: 'Room details updated',
    };
  }

  async blockRoomDates(roomId: string, checkInDate: Date, checkOutDate: Date, quantity: number) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) {
      const error: any = new Error('Room not found');
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const lock = await prisma.inventoryLock.create({
      data: {
        roomId,
        quantity,
        checkInDate,
        checkOutDate,
        lockUntil: new Date('9999-12-31T23:59:59.000Z'), // Permanent lock until manually lifted
      },
    });

    logger.info({ roomId, lockId: lock.id }, 'Room dates forcibly blocked by admin');

    return {
      lockId: lock.id,
      roomId: lock.roomId,
      message: 'Room dates permanently blocked for specified duration',
    };
  }

  async getRoomInventory(roomId: string, startDate: Date, endDate: Date) {
    const [days, locks] = await Promise.all([
      prisma.inventoryDay.findMany({
        where: {
          roomId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.inventoryLock.findMany({
        where: {
          roomId,
          OR: [
            { checkInDate: { lte: endDate }, checkOutDate: { gte: startDate } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      days: days.map(d => ({
        date: d.date,
        totalRooms: d.totalRooms,
        availableRooms: d.availableRooms
      })),
      locks: locks.map(l => ({
        id: l.id,
        quantity: l.quantity,
        checkInDate: l.checkInDate,
        checkOutDate: l.checkOutDate,
        lockUntil: l.lockUntil,
        isExpired: l.lockUntil < new Date() && l.lockUntil.getFullYear() < 9000
      }))
    };
  }

  async overrideRoomInventory(roomId: string, date: Date, availableRooms: number) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      const error: any = new Error('Room not found');
      error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const result = await prisma.inventoryDay.upsert({
      where: { roomId_date: { roomId, date } },
      update: { availableRooms },
      create: {
        roomId,
        date,
        totalRooms: room.totalRooms,
        availableRooms
      }
    });

    logger.info({ roomId, date, availableRooms }, 'Inventory manually overridden by admin');
    return result;
  }

  async releaseRoomLocks(roomId: string, lockId?: string) {
    const where: any = { roomId };
    if (lockId) where.id = lockId;

    const result = await prisma.inventoryLock.deleteMany({ where });
    logger.info({ roomId, lockId }, 'Inventory locks manually released by admin');
    return { count: result.count };
  }

  async cleanupInventoryLocks() {
    const result = await prisma.inventoryLock.deleteMany({
      where: {
        lockUntil: { lt: new Date() },
        // Don't delete permanent admin blocks (year 9999)
        NOT: { lockUntil: { gte: new Date('9990-01-01') } }
      }
    });

    logger.info({ count: result.count }, 'Cleanup of expired inventory locks completed');
    return { count: result.count };
  }

  async getAnalytics(range: '7d' | '30d' | '3m') {
    const daysMap = { '7d': 7, '30d': 30, '3m': 90 } as const;
    const days = daysMap[range] ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalUsers, totalProperties, totalBookings, totalRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.property.count({ where: { status: 'ACTIVE' } }),
      prisma.booking.count({ where: { createdAt: { gte: startDate } } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startDate } },
        _sum: { amount: true },
      }),
    ]);

    const months: { month: string; start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      months.push({
        month: date.toLocaleString('en-US', { month: 'short' }),
        start: date,
        end,
      });
    }

    const bookingsByMonth = await Promise.all(
      months.map(async (month) => {
        const count = await prisma.booking.count({
          where: { createdAt: { gte: month.start, lte: month.end } },
        });
        return { month: month.month, count };
      })
    );

    const revenueByMonth = await Promise.all(
      months.map(async (month) => {
        const revenue = await prisma.payment.aggregate({
          where: { status: 'COMPLETED', createdAt: { gte: month.start, lte: month.end } },
          _sum: { amount: true },
        });
        return { month: month.month, amount: revenue._sum.amount?.toNumber() || 0 };
      })
    );

    const topPropertiesRaw = await prisma.property.findMany({
      where: { status: 'ACTIVE' },
      take: 5,
      orderBy: { bookingCount: 'desc' },
      select: {
        name: true,
        bookingCount: true,
        bookings: {
          select: {
            totalAmount: true,
          },
        },
      },
    });

    const topProperties = topPropertiesRaw.map((property) => ({
      name: property.name,
      bookings: property.bookingCount,
      revenue: property.bookings.reduce((sum, booking) => sum + booking.totalAmount.toNumber(), 0),
    }));

    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - days);
    const previousEnd = new Date(startDate);

    const [prevUsers, prevProperties, prevBookings, prevRevenue] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: previousStart, lte: previousEnd } } }),
      prisma.property.count({ where: { createdAt: { gte: previousStart, lte: previousEnd } } }),
      prisma.booking.count({ where: { createdAt: { gte: previousStart, lte: previousEnd } } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: previousStart, lte: previousEnd } },
        _sum: { amount: true },
      }),
    ]);

    const prevRevenueAmount = prevRevenue._sum.amount?.toNumber() || 0;

    const growth = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    return {
      totalUsers,
      userGrowth: growth(totalUsers, prevUsers),
      totalProperties,
      propertyGrowth: growth(totalProperties, prevProperties),
      totalBookings,
      bookingGrowth: growth(totalBookings, prevBookings),
      totalRevenue: totalRevenue._sum.amount?.toNumber() || 0,
      revenueGrowth: growth(totalRevenue._sum.amount?.toNumber() || 0, prevRevenueAmount),
      bookingsByMonth,
      revenueByMonth,
      topProperties,
    };
  }

  // ─── Export Data ───

  async exportData(entity: 'users' | 'vendors' | 'properties' | 'bookings' | 'payouts' | 'payments' | 'refunds') {
    switch (entity) {
      case 'users': {
        const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, isDeleted: true, createdAt: true, lastLoginAt: true } });
        return users.map(u => ({ ...u, createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt?.toISOString() || '' }));
      }
      case 'vendors': {
        const vendors = await prisma.vendor.findMany({ select: { id: true, businessName: true, user: { select: { email: true } }, isApproved: true, commissionRate: true, createdAt: true } });
        return vendors.map(v => ({ id: v.id, businessName: v.businessName, email: v.user.email, isApproved: v.isApproved, commissionRate: v.commissionRate.toString(), createdAt: v.createdAt.toISOString() }));
      }
      case 'properties': {
        const props = await prisma.property.findMany({ select: { id: true, name: true, type: true, city: true, status: true, reviewCount: true, rating: true, createdAt: true, vendor: { select: { businessName: true } } } });
        return props.map(p => ({ id: p.id, name: p.name, type: p.type, city: p.city, status: p.status, rating: p.rating?.toString() || '', reviewCount: p.reviewCount, vendor: p.vendor?.businessName || '', createdAt: p.createdAt.toISOString() }));
      }
      case 'bookings': {
        const b = await prisma.booking.findMany({ select: { id: true, bookingNumber: true, status: true, totalAmount: true, checkInDate: true, checkOutDate: true, createdAt: true, property: { select: { name: true } }, user: { select: { email: true } } } });
        return b.map(x => ({ id: x.id, reference: x.bookingNumber, status: x.status, property: x.property.name, userEmail: x.user.email, amount: x.totalAmount.toString(), checkIn: x.checkInDate.toISOString(), checkOut: x.checkOutDate.toISOString(), createdAt: x.createdAt.toISOString() }));
      }
      case 'payouts': {
        const p = await prisma.payout.findMany({ select: { id: true, status: true, amount: true, periodStart: true, periodEnd: true, processedAt: true, transactionId: true, vendor: { select: { businessName: true } } } });
        return p.map(x => ({ id: x.id, vendor: x.vendor.businessName, status: x.status, amount: x.amount.toString(), periodStart: x.periodStart.toISOString(), periodEnd: x.periodEnd.toISOString(), processedAt: x.processedAt?.toISOString() || '', transactionId: x.transactionId || '' }));
      }
      case 'payments': {
        const p = await prisma.payment.findMany({ include: { booking: { include: { property: { select: { name: true } } } } } });
        return p.map(x => ({
          id: x.id,
          bookingNumber: x.booking?.bookingNumber || '',
          property: x.booking?.property?.name || '',
          amount: x.amount.toString(),
          status: x.status,
          method: x.method || '',
          razorpayOrderId: x.razorpayOrderId || '',
          razorpayPaymentId: x.razorpayPaymentId || '',
          createdAt: x.createdAt.toISOString()
        }));
      }
      case 'refunds': {
        const r = await prisma.refund.findMany({ include: { payment: { include: { booking: true } } } });
        return r.map(x => ({
          id: x.id,
          paymentId: x.paymentId,
          bookingNumber: x.payment?.booking?.bookingNumber || '',
          amount: x.amount.toString(),
          reason: x.reason || '',
          status: x.status,
          razorpayRefundId: x.razorpayRefundId || '',
          createdAt: x.createdAt.toISOString()
        }));
      }
      default:
        throw new Error('Invalid export entity');
    }
  }
}

export const adminService = new AdminService();
export default adminService;
