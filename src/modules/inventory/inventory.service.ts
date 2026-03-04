import prisma from '../../config/database';
import { ERROR_CODES } from '../../constants/error-codes';

export class InventoryService {
  async getAvailability(roomId: string, date: Date) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      const error = new Error('Room not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const activeLocks = await prisma.inventoryLock.aggregate({
      where: {
        roomId,
        lockUntil: { gte: new Date() },
      },
      _sum: { quantity: true },
    });

    const bookings = await prisma.booking.aggregate({
      where: {
        roomId,
        status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
        OR: [
          {
            checkInDate: { lte: endOfDay },
            checkOutDate: { gte: startOfDay },
          },
        ],
      },
      _count: { id: true },
    });

    const lockedRooms = activeLocks._sum.quantity || 0;
    const bookedRooms = bookings._count.id || 0;
    const available = Math.max(room.totalRooms - lockedRooms - bookedRooms, 0);

    return {
      roomId,
      totalRooms: room.totalRooms,
      lockedRooms,
      bookedRooms,
      availableRooms: available,
    };
  }

  async lockInventory(
    roomId: string,
    userId: string | undefined,
    quantity: number,
    checkIn: Date,
    checkOut: Date
  ) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      const error = new Error('Room not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const activeLocks = await prisma.inventoryLock.aggregate({
      where: {
        roomId,
        lockUntil: { gte: new Date() },
        OR: [
          {
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        ],
      },
      _sum: { quantity: true },
    });

    const lockedRooms = activeLocks._sum.quantity || 0;
    if (lockedRooms + quantity > room.totalRooms) {
      const error = new Error('Room not available');
      (error as any).code = ERROR_CODES.ROOM_NOT_AVAILABLE;
      throw error;
    }

    const lockUntil = new Date(Date.now() + 10 * 60 * 1000);

    const lock = await prisma.inventoryLock.create({
      data: {
        roomId,
        userId,
        quantity,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        lockUntil,
      },
    });

    return {
      id: lock.id,
      roomId: lock.roomId,
      quantity: lock.quantity,
      lockUntil: lock.lockUntil,
    };
  }

  async releaseLock(roomId: string, userId?: string) {
    const where: any = { roomId };
    if (userId) {
      where.userId = userId;
    }

    await prisma.inventoryLock.deleteMany({
      where,
    });

    return { message: 'Inventory lock released' };
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
