import prisma from '../../config/database';
import { cacheService } from '../../services/cache.service';
import { logger } from '../../utils/logger.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { Prisma } from '@prisma/client';

export class RoomsService {
  async getAll(filters: {
    page?: number;
    limit?: number;
    propertyId?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    capacity?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.RoomWhereInput = { isActive: true, isDeleted: false };

    if (filters.propertyId) {
      where.propertyId = filters.propertyId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.pricePerNight = {};
      if (filters.minPrice !== undefined) {
        where.pricePerNight.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        where.pricePerNight.lte = new Prisma.Decimal(filters.maxPrice);
      }
    }

    if (filters.capacity) {
      where.capacity = { gte: filters.capacity };
    }

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { pricePerNight: 'asc' },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              city: true,
              images: true,
            },
          },
        },
      }),
      prisma.room.count({ where }),
    ]);

    return {
      rooms: rooms.map(this.sanitizeRoom),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const room = await prisma.room.findUnique({
      where: { id, isDeleted: false },
      include: {
        property: {
          include: {
            vendor: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      const error = new Error('Room not found');
      (error as any).code = ERROR_CODES.ROOM_NOT_FOUND;
      throw error;
    }

    return this.sanitizeRoom(room);
  }

  async create(data: {
    propertyId: string;
    name: string;
    description?: string;
    type: string;
    capacity: number;
    extraBedCapacity: number;
    sizeSqm?: number;
    pricePerNight: number;
    weekendPrice?: number;
    seasonalPricing?: any[];
    amenities: string[];
    images: any[];
    totalRooms: number;
    availableRooms: number;
  }) {
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId, isDeleted: false },
    });

    if (!property) {
      const error = new Error('Property not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const room = await prisma.room.create({
      data: {
        propertyId: data.propertyId,
        name: data.name,
        description: data.description,
        type: data.type,
        capacity: data.capacity,
        extraBedCapacity: data.extraBedCapacity,
        sizeSqm: data.sizeSqm ? new Prisma.Decimal(data.sizeSqm) : null,
        pricePerNight: new Prisma.Decimal(data.pricePerNight),
        weekendPrice: data.weekendPrice ? new Prisma.Decimal(data.weekendPrice) : null,
        seasonalPricing: data.seasonalPricing || [],
        amenities: data.amenities,
        images: data.images,
        totalRooms: data.totalRooms,
        availableRooms: data.availableRooms,
      },
    });

    await cacheService.del(cacheService.keys.property(data.propertyId));

    logger.info({ roomId: room.id }, 'Room created');

    return this.sanitizeRoom(room);
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    type: string;
    capacity: number;
    extraBedCapacity: number;
    sizeSqm: number;
    pricePerNight: number;
    weekendPrice: number;
    seasonalPricing: any[];
    amenities: string[];
    images: any[];
    totalRooms: number;
    availableRooms: number;
    isActive: boolean;
  }>) {
    const room = await prisma.room.findUnique({
      where: { id, isDeleted: false },
      include: { property: true },
    });

    if (!room) {
      const error = new Error('Room not found');
      (error as any).code = ERROR_CODES.ROOM_NOT_FOUND;
      throw error;
    }

    const updateData: any = { ...data };

    if (data.pricePerNight !== undefined) {
      updateData.pricePerNight = new Prisma.Decimal(data.pricePerNight);
    }
    if (data.weekendPrice !== undefined) {
      updateData.weekendPrice = data.weekendPrice ? new Prisma.Decimal(data.weekendPrice) : null;
    }
    if (data.sizeSqm !== undefined) {
      updateData.sizeSqm = data.sizeSqm ? new Prisma.Decimal(data.sizeSqm) : null;
    }

    const updated = await prisma.room.update({
      where: { id },
      data: updateData,
    });

    await cacheService.del(cacheService.keys.property(room.propertyId));

    logger.info({ roomId: id }, 'Room updated');

    return this.sanitizeRoom(updated);
  }

  async delete(id: string) {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!room) {
      const error = new Error('Room not found');
      (error as any).code = ERROR_CODES.ROOM_NOT_FOUND;
      throw error;
    }

    await prisma.room.update({
      where: { id },
      data: { isActive: false, isDeleted: true, deletedAt: new Date() },
    });

    await cacheService.del(cacheService.keys.property(room.propertyId));

    logger.info({ roomId: id }, 'Room deleted');

    return { message: 'Room deleted successfully' };
  }

  async checkAvailability(roomId: string, checkIn: Date, checkOut: Date) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { property: true },
    });

    if (!room) {
      const error = new Error('Room not found');
      (error as any).code = ERROR_CODES.ROOM_NOT_FOUND;
      throw error;
    }

    const overlappingBookings = await prisma.booking.count({
      where: {
        roomId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          {
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        ],
      },
    });

    const availableRooms = room.totalRooms - overlappingBookings;

    return {
      available: availableRooms > 0,
      availableRooms,
      totalRooms: room.totalRooms,
      room: {
        id: room.id,
        name: room.name,
        type: room.type,
        pricePerNight: room.pricePerNight.toNumber(),
      },
    };
  }

  async getByProperty(propertyId: string) {
    const rooms = await prisma.room.findMany({
      where: {
        propertyId,
        isActive: true,
      },
      orderBy: { pricePerNight: 'asc' },
    });

    return rooms.map(this.sanitizeRoom);
  }

  private sanitizeRoom = (room: any) => {
    return {
      id: room.id,
      propertyId: room.propertyId,
      property: room.property,
      name: room.name,
      description: room.description,
      type: room.type,
      capacity: room.capacity,
      extraBedCapacity: room.extraBedCapacity,
      sizeSqm: room.sizeSqm?.toNumber?.() || room.sizeSqm,
      pricePerNight: room.pricePerNight?.toNumber?.() || room.pricePerNight,
      weekendPrice: room.weekendPrice?.toNumber?.() || room.weekendPrice,
      seasonalPricing: room.seasonalPricing,
      amenities: room.amenities,
      images: room.images,
      totalRooms: room.totalRooms,
      availableRooms: room.availableRooms,
      isActive: room.isActive,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }
}

export const roomsService = new RoomsService();
export default roomsService;
