import prisma from '../../config/database';
import { logger } from '../../utils/logger.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { Prisma } from '@prisma/client';

export class WishlistService {
  async getAll(userId: string, filters: {
    page?: number;
    limit?: number;
    itemType?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.WishlistWhereInput = { userId };

    if (filters.itemType) {
      where.itemType = filters.itemType;
    }

    const [items, total] = await Promise.all([
      prisma.wishlist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wishlist.count({ where }),
    ]);

    return {
      items: items.map(this.sanitizeWishlistItem),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async add(userId: string, data: {
    itemType: string;
    itemId: string;
    itemName: string;
    itemImage: string;
    itemLocation: string;
    itemPrice?: number;
    itemRating?: number;
  }) {
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType: data.itemType,
          itemId: data.itemId,
        },
      },
    });

    if (existing) {
      const error = new Error('Item already in wishlist');
      (error as any).code = ERROR_CODES.RESOURCE_CONFLICT;
      throw error;
    }

    const item = await prisma.wishlist.create({
      data: {
        userId,
        itemType: data.itemType,
        itemId: data.itemId,
        itemName: data.itemName,
        itemImage: data.itemImage,
        itemLocation: data.itemLocation,
        itemPrice: data.itemPrice ? new Prisma.Decimal(data.itemPrice) : null,
        itemRating: data.itemRating ? new Prisma.Decimal(data.itemRating) : null,
      },
    });

    logger.info({ wishlistId: item.id, userId }, 'Item added to wishlist');

    return this.sanitizeWishlistItem(item);
  }

  async remove(id: string, userId: string) {
    const item = await prisma.wishlist.findFirst({
      where: { id, userId },
    });

    if (!item) {
      const error = new Error('Wishlist item not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    await prisma.wishlist.delete({
      where: { id },
    });

    logger.info({ wishlistId: id }, 'Item removed from wishlist');

    return { message: 'Item removed from wishlist' };
  }

  async removeByItemId(userId: string, itemId: string, itemType: string) {
    const item = await prisma.wishlist.findFirst({
      where: {
        userId,
        itemId,
        itemType,
      },
    });

    if (!item) {
      const error = new Error('Wishlist item not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    await prisma.wishlist.delete({
      where: { id: item.id },
    });

    logger.info({ wishlistId: item.id, userId }, 'Item removed from wishlist');

    return { message: 'Item removed from wishlist' };
  }

  async checkItem(userId: string, itemId: string, itemType: string) {
    const item = await prisma.wishlist.findFirst({
      where: {
        userId,
        itemId,
        itemType,
      },
    });

    return {
      isInWishlist: !!item,
      itemId: item?.id || null,
    };
  }

  async clear(userId: string) {
    await prisma.wishlist.deleteMany({
      where: { userId },
    });

    logger.info({ userId }, 'Wishlist cleared');

    return { message: 'Wishlist cleared' };
  }

  private sanitizeWishlistItem(item: any) {
    return {
      id: item.id,
      userId: item.userId,
      itemType: item.itemType,
      itemId: item.itemId,
      itemName: item.itemName,
      itemImage: item.itemImage,
      itemLocation: item.itemLocation,
      itemPrice: item.itemPrice?.toNumber?.() || item.itemPrice,
      itemRating: item.itemRating?.toNumber?.() || item.itemRating,
      createdAt: item.createdAt,
    };
  }
}

export const wishlistService = new WishlistService();
export default wishlistService;
