import prisma from '../../config/database';
import { cacheService } from '../../services/cache.service';
import { logger } from '../../utils/logger.util';
import { generateSlug } from '../../utils/crypto.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { Prisma } from '@prisma/client';

export class PropertiesService {
  async getAll(filters: {
    page?: number;
    limit?: number;
    type?: string;
    city?: string;
    state?: string;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
    rating?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    lat?: number;
    lng?: number;
    radius?: number;
    vendorId?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      status: 'ACTIVE',
      isDeleted: false,
    };

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters.type) {
      where.type = filters.type as any;
    }

    if (filters.city) {
      where.city = filters.city as any;
    }

    if (filters.state) {
      where.state = { equals: filters.state, mode: 'insensitive' };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.basePrice = {};
      if (filters.minPrice !== undefined) {
        where.basePrice.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        where.basePrice.lte = new Prisma.Decimal(filters.maxPrice);
      }
    }

    if (filters.amenities && filters.amenities.length > 0) {
      where.amenities = {
        array_contains: filters.amenities,
      } as any;
    }

    if (filters.rating) {
      where.rating = { gte: new Prisma.Decimal(filters.rating) };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.PropertyOrderByWithRelationInput = { createdAt: 'desc' };

    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price_asc':
          orderBy = { basePrice: 'asc' };
          break;
        case 'price_desc':
          orderBy = { basePrice: 'desc' };
          break;
        case 'rating':
          orderBy = { rating: 'desc' };
          break;
        case 'popularity':
          orderBy = { bookingCount: 'desc' };
          break;
        default:
          orderBy = { createdAt: filters.sortOrder || 'desc' };
      }
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          rooms: {
            where: { isActive: true, isDeleted: false },
            select: {
              id: true,
              name: true,
              type: true,
              pricePerNight: true,
              capacity: true,
            },
          },
          templeDetails: filters.type === 'TEMPLE',
        },
      }),
      prisma.property.count({ where }),
    ]);

    return {
      properties: properties.map(this.sanitizeProperty),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const cacheKey = cacheService.keys.property(id);
    const cached = await cacheService.get<any>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const property = await prisma.property.findUnique({
      where: { id, isDeleted: false },
      include: {
        rooms: {
          where: { isActive: true, isDeleted: false },
        },
        templeDetails: true,
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!property) {
      const error = new Error('Property not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    await prisma.property.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    const result = this.sanitizeProperty(property);
    
    await cacheService.set(cacheKey, result, cacheService.getTTL().PROPERTY_DETAIL);

    return result;
  }

  async create(data: {
    type: 'HOTEL' | 'HOME' | 'TEMPLE';
    name: string;
    description: string;
    shortDesc?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
    images: any[];
    amenities: string[];
    highlights?: string[];
    basePrice: number;
    metaTitle?: string;
    metaDesc?: string;
    vendorId?: string;
  }) {
    const slug = generateSlug(data.name);
    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    const property = await prisma.property.create({
      data: {
        type: data.type as any,
        name: data.name,
        slug: uniqueSlug,
        description: data.description,
        shortDesc: data.shortDesc,
        address: data.address,
        city: data.city as any,
        state: data.state,
        pincode: data.pincode,
        latitude: data.latitude ? new Prisma.Decimal(data.latitude) : null,
        longitude: data.longitude ? new Prisma.Decimal(data.longitude) : null,
        images: data.images,
        amenities: data.amenities,
        highlights: data.highlights || [],
        basePrice: new Prisma.Decimal(data.basePrice),
        metaTitle: data.metaTitle,
        metaDesc: data.metaDesc,
        vendorId: data.vendorId,
        status: data.vendorId ? 'DRAFT' : 'ACTIVE',
      },
    });

    logger.info({ propertyId: property.id }, 'Property created');

    return this.sanitizeProperty(property);
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    shortDesc: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    images: any[];
    amenities: string[];
    highlights: string[];
    basePrice: number;
    metaTitle: string;
    metaDesc: string;
    status: string;
    isFeatured: boolean;
  }>, vendorId?: string) {
    const property = await prisma.property.findUnique({ where: { id } });

    if (!property) {
      const error = new Error('Property not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    if (vendorId && property.vendorId !== vendorId) {
      const error = new Error('Not authorized to update this property');
      (error as any).code = ERROR_CODES.FORBIDDEN;
      throw error;
    }

    const updateData: any = { ...data };

    if (data.basePrice !== undefined) {
      updateData.basePrice = new Prisma.Decimal(data.basePrice);
    }
    if (data.latitude !== undefined) {
      updateData.latitude = data.latitude ? new Prisma.Decimal(data.latitude) : null;
    }
    if (data.longitude !== undefined) {
      updateData.longitude = data.longitude ? new Prisma.Decimal(data.longitude) : null;
    }

    const updated = await prisma.property.update({
      where: { id },
      data: updateData,
    });

    await cacheService.del(cacheService.keys.property(id));

    logger.info({ propertyId: id }, 'Property updated');

    return this.sanitizeProperty(updated);
  }

  async delete(id: string) {
    const property = await prisma.property.findUnique({ where: { id } });

    if (!property) {
      const error = new Error('Property not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    await prisma.property.update({
      where: { id },
      data: { status: 'INACTIVE', isDeleted: true, deletedAt: new Date() },
    });

    await cacheService.del(cacheService.keys.property(id));

    logger.info({ propertyId: id }, 'Property deleted');

    return { message: 'Property deleted successfully' };
  }

  async checkAvailability(propertyId: string, checkIn: Date, checkOut: Date, roomId?: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        rooms: roomId ? { where: { id: roomId } } : { where: { isActive: true } },
      },
    });

    if (!property) {
      const error = new Error('Property not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const overlappingBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          {
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        ],
      },
      select: { roomId: true },
    });

    const bookedRoomIds = overlappingBookings.map((b) => b.roomId).filter(Boolean);

    const availableRooms = property.rooms.filter(
      (room) => !bookedRoomIds.includes(room.id)
    );

    return {
      available: availableRooms.length > 0,
      availableRooms: availableRooms.length,
      totalRooms: property.rooms.length,
      rooms: availableRooms.map((room) => ({
        id: room.id,
        name: room.name,
        type: room.type,
        pricePerNight: room.pricePerNight.toNumber(),
        capacity: room.capacity,
      })),
    };
  }

  async getFeatured(limit: number = 6) {
    const properties = await prisma.property.findMany({
      where: {
        status: 'ACTIVE',
        isFeatured: true,
      },
      take: limit,
      orderBy: { rating: 'desc' },
    });

    return properties.map(this.sanitizeProperty);
  }

  async getCities() {
    const cities = await prisma.property.groupBy({
      by: ['city', 'state'],
      where: { status: 'ACTIVE' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return cities.map((c) => ({
      city: c.city,
      state: c.state,
      count: c._count.id,
    }));
  }

  async search(query: string, limit: number = 10) {
    const properties = await prisma.property.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { state: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });

    return properties.map(this.sanitizeProperty);
  }

  private sanitizeProperty = (property: any) => {
    return {
      id: property.id,
      type: property.type,
      name: property.name,
      slug: property.slug,
      description: property.description,
      shortDesc: property.shortDesc,
      address: property.address,
      city: property.city,
      state: property.state,
      pincode: property.pincode,
      latitude: property.latitude?.toNumber?.() || property.latitude,
      longitude: property.longitude?.toNumber?.() || property.longitude,
      images: property.images,
      amenities: property.amenities,
      highlights: property.highlights,
      basePrice: property.basePrice?.toNumber?.() || property.basePrice,
      currency: property.currency,
      rating: property.rating?.toNumber?.() || property.rating,
      reviewCount: property.reviewCount,
      bookingCount: property.bookingCount,
      viewCount: property.viewCount,
      isFeatured: property.isFeatured,
      isVerified: property.isVerified,
      rooms: property.rooms?.map(this.sanitizeRoom),
      templeDetails: property.templeDetails,
      reviews: property.reviews,
      vendor: property.vendor,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }

  private sanitizeRoom = (room: any) => {
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      type: room.type,
      capacity: room.capacity,
      extraBedCapacity: room.extraBedCapacity,
      pricePerNight: room.pricePerNight?.toNumber?.() || room.pricePerNight,
      weekendPrice: room.weekendPrice?.toNumber?.() || room.weekendPrice,
      amenities: room.amenities,
      images: room.images,
      totalRooms: room.totalRooms,
      availableRooms: room.availableRooms,
      isActive: room.isActive,
    };
  }
}

export const propertiesService = new PropertiesService();
export default propertiesService;
