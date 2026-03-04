import prisma from '../../config/database';
import { cacheService } from '../../services/cache.service';
import { logger } from '../../utils/logger.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { Prisma } from '@prisma/client';

export class ReviewsService {
  async getAll(filters: {
    page?: number;
    limit?: number;
    propertyId?: string;
    rating?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      isVisible: true,
    };

    if (filters.propertyId) {
      where.propertyId = filters.propertyId;
    }

    if (filters.rating) {
      where.rating = filters.rating;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          property: {
            select: {
              id: true,
              name: true,
              type: true,
              city: true,
              images: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews: reviews.map(this.sanitizeReview),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        booking: {
          select: {
            id: true,
            checkInDate: true,
            checkOutDate: true,
          },
        },
      },
    });

    if (!review) {
      const error = new Error('Review not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    return this.sanitizeReview(review);
  }

  async create(data: {
    userId: string;
    propertyId: string;
    bookingId?: string;
    rating: number;
    title?: string;
    comment: string;
    cleanliness?: number;
    service?: number;
    location?: number;
    value?: number;
    images?: string[];
    videos?: string[];
  }) {
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property) {
      const error = new Error('Property not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const eligibleBookingWhere: Prisma.BookingWhereInput = {
      userId: data.userId,
      propertyId: data.propertyId,
      status: 'CHECKED_OUT',
    };

    if (data.bookingId) {
      eligibleBookingWhere.id = data.bookingId;
    }

    const eligibleBooking = await prisma.booking.findFirst({
      where: eligibleBookingWhere,
      orderBy: { checkOutDate: 'desc' },
    });

    if (!eligibleBooking) {
      const error = new Error('Only users with completed bookings can review this property');
      (error as any).code = ERROR_CODES.FORBIDDEN;
      throw error;
    }

    const existingReview = await prisma.review.findUnique({
      where: {
        userId_propertyId: {
          userId: data.userId,
          propertyId: data.propertyId,
        },
      },
    });

    if (existingReview) {
      const error = new Error('You have already reviewed this property');
      (error as any).code = ERROR_CODES.RESOURCE_CONFLICT;
      throw error;
    }

    const review = await prisma.review.create({
      data: {
        userId: data.userId,
        propertyId: data.propertyId,
        bookingId: data.bookingId || eligibleBooking.id,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        cleanliness: data.cleanliness,
        service: data.service,
        location: data.location,
        value: data.value,
        images: data.images || [],
        videos: data.videos || [],
        isVerified: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.updatePropertyRating(data.propertyId);

    logger.info({ reviewId: review.id }, 'Review created');

    return this.sanitizeReview(review);
  }

  async update(id: string, userId: string, data: Partial<{
    rating: number;
    title: string;
    comment: string;
    cleanliness: number;
    service: number;
    location: number;
    value: number;
    images: string[];
  }>) {
    const review = await prisma.review.findFirst({
      where: { id, userId, isDeleted: false },
    });

    if (!review) {
      const error = new Error('Review not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...data,
        isVerified: false,
      },
    });

    await this.updatePropertyRating(review.propertyId);

    logger.info({ reviewId: id }, 'Review updated');

    return this.sanitizeReview(updated);
  }

  async delete(id: string, userId: string, role: string) {
    const where = role === 'ADMIN'
      ? { id }
      : { id, userId };

    const review = await prisma.review.findFirst({ where: { ...where, isDeleted: false } });

    if (!review) {
      const error = new Error('Review not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    await prisma.review.update({
      where: { id },
      data: { isVisible: false, isDeleted: true, deletedAt: new Date() },
    });

    await this.updatePropertyRating(review.propertyId);

    logger.info({ reviewId: id }, 'Review deleted');

    return { message: 'Review deleted successfully' };
  }

  async getPropertyReviews(propertyId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total, stats] = await Promise.all([
      prisma.review.findMany({
        where: {
          propertyId,
          isVisible: true,
          isDeleted: false,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.review.count({
        where: { propertyId, isVisible: true },
      }),
      prisma.review.aggregate({
        where: { propertyId, isVisible: true },
        _avg: {
          rating: true,
          cleanliness: true,
          service: true,
          location: true,
          value: true,
        },
        _count: { id: true },
      }),
    ]);

    return {
      reviews: reviews.map(this.sanitizeReview),
      stats: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count.id,
        breakdown: {
          cleanliness: stats._avg.cleanliness || 0,
          service: stats._avg.service || 0,
          location: stats._avg.location || 0,
          value: stats._avg.value || 0,
        },
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async updatePropertyRating(propertyId: string) {
    const stats = await prisma.review.aggregate({
      where: {
        propertyId,
        isVisible: true,
      },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        rating: new Prisma.Decimal(stats._avg.rating || 0),
        reviewCount: stats._count.id,
      },
    });

    await cacheService.del(cacheService.keys.property(propertyId));
  }

  private sanitizeReview(review: any) {
    return {
      id: review.id,
      user: review.user,
      property: review.property,
      bookingId: review.bookingId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      cleanliness: review.cleanliness,
      service: review.service,
      location: review.location,
      value: review.value,
      isVerified: review.isVerified,
      isVisible: review.isVisible,
      vendorResponse: review.vendorResponse,
      respondedAt: review.respondedAt,
      images: review.images,
      videos: review.videos,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  async getVendorReviews(vendorId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          property: { vendorId },
          isVisible: true,
          isDeleted: false,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          property: {
            select: { id: true, name: true, type: true, city: true, images: true },
          },
        },
      }),
      prisma.review.count({
        where: { property: { vendorId }, isVisible: true, isDeleted: false },
      }),
    ]);

    return {
      reviews: reviews.map(this.sanitizeReview),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async respondToReview(id: string, vendorId: string, responseText: string) {
    const review = await prisma.review.findFirst({
      where: { id, isDeleted: false },
      include: { property: true },
    });

    if (!review || review.property.vendorId !== vendorId) {
      const error = new Error('Review not found or unauthorized');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        vendorResponse: responseText,
        respondedAt: new Date(),
      },
    });

    logger.info({ reviewId: id, vendorId }, 'Vendor responded to review');

    return this.sanitizeReview(updated);
  }

  // ─── Admin Methods ───

  async getAllAdmin(filters: {
    page?: number;
    limit?: number;
    propertyId?: string;
    rating?: number;
    isVisible?: boolean;
    isVerified?: boolean;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = { isDeleted: false };
    if (filters.propertyId) where.propertyId = filters.propertyId;
    if (filters.rating) where.rating = filters.rating;
    if (filters.isVisible !== undefined) where.isVisible = filters.isVisible;
    if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, email: true } },
          property: { select: { id: true, name: true, type: true, city: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews: reviews.map(this.sanitizeReview),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async hideReview(id: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      const error = new Error('Review not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    const updated = await prisma.review.update({
      where: { id },
      data: { isVisible: false },
    });
    await this.updatePropertyRating(review.propertyId);
    logger.info({ reviewId: id }, 'Review hidden by admin');
    return this.sanitizeReview(updated);
  }

  async unhideReview(id: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      const error = new Error('Review not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    const updated = await prisma.review.update({
      where: { id },
      data: { isVisible: true },
    });
    await this.updatePropertyRating(review.propertyId);
    logger.info({ reviewId: id }, 'Review unhidden by admin');
    return this.sanitizeReview(updated);
  }

  async verifyReview(id: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      const error = new Error('Review not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    const updated = await prisma.review.update({
      where: { id },
      data: { isVerified: true },
    });
    logger.info({ reviewId: id }, 'Review verified by admin');
    return this.sanitizeReview(updated);
  }

  async adminUpdateReviewContent(id: string, data: { title?: string; comment?: string }) {
    const review = await prisma.review.findFirst({ where: { id, isDeleted: false } });
    if (!review) {
      const error = new Error('Review not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.comment !== undefined && { comment: data.comment }),
      },
    });
    logger.info({ reviewId: id }, 'Review content updated by admin');
    return this.sanitizeReview(updated);
  }

  async adminDeleteReview(id: string) {
    const review = await prisma.review.findFirst({ where: { id, isDeleted: false } });
    if (!review) {
      const error = new Error('Review not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }
    await prisma.review.update({
      where: { id },
      data: { isVisible: false, isDeleted: true, deletedAt: new Date() },
    });
    await this.updatePropertyRating(review.propertyId);
    logger.info({ reviewId: id }, 'Review deleted by admin');
    return { message: 'Review deleted successfully' };
  }
}

export const reviewsService = new ReviewsService();
export default reviewsService;
