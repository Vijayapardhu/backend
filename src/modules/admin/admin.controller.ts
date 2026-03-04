
import { FastifyRequest, FastifyReply } from "fastify";
import adminService from "./admin.service";
import { sendSuccess, sendError } from "../../utils/response.util";
import { ERROR_CODES } from "../../constants/error-codes";
import { logger } from "../../utils/logger.util";
import { reviewsService } from "../reviews/reviews.service";
import { jsonToCsv } from "../../utils/csv.util";
import {
  updateUserStatusSchema,
  propertyApprovalSchema,
  systemStatsSchema,
  adminFilterSchema,
  payoutProcessingSchema,
  bookingRefundSchema,
  markPayoutPaidSchema,
  adminRoomUpdateSchema,
  adminRoomBlockSchema,
  analyticsSchema,
  adminUpdateVendorSchema,
  updateVendorCommissionSchema,
} from "./admin.schema";
import { platformSettingsSchema } from "./admin-settings.schema";

export const AdminController = {
  async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const dashboard = await adminService.getDashboard();
      return sendSuccess(reply, dashboard);
    } catch (error: any) {
      logger.error({ error }, "Get admin dashboard failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch dashboard",
        500,
      );
    }
  },

  async getSystemStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = systemStatsSchema.parse(request.query);

      const stats = await adminService.getSystemStats(
        query.startDate ? new Date(query.startDate) : undefined,
        query.endDate ? new Date(query.endDate) : undefined,
      );

      return sendSuccess(reply, stats);
    } catch (error: any) {
      logger.error({ error }, "Get system stats failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch stats",
        500,
      );
    }
  },

  async getAnalytics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = analyticsSchema.parse(request.query);
      const result = await adminService.getAnalytics(query.range);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Get analytics failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch analytics",
        500,
      );
    }
  },

  async getSettings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await adminService.getPlatformSettings();
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Get settings failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch settings",
        500,
      );
    }
  },

  async updateSettings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = platformSettingsSchema.parse(request.body);
      const result = await adminService.updatePlatformSettings(data);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Update settings failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update settings",
        500,
      );
    }
  },

  async getHomepageConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const config = await adminService.getHomepageConfig();
      return sendSuccess(reply, config);
    } catch (error: any) {
      logger.error({ error }, "Get homepage config failed");
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to fetch homepage config", 500);
    }
  },

  async updateHomepageConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const config = request.body as Record<string, unknown>;
      const result = await adminService.updateHomepageConfig(config);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Update homepage config failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to update homepage config", 500);
    }
  },

  async getAllUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const result = await adminService.getAllUsers({
        page: parseInt(query.page || "1"),
        limit: parseInt(query.limit || "10"),
        role: query.role,
        search: query.search,
        status: query.status,
      });

      return sendSuccess(reply, result.users, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, "Get users failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch users",
        500,
      );
    }
  },

  async updateUserStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = updateUserStatusSchema.parse(request.body);

      const result = await adminService.updateUserStatus(id, data.isActive);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Update user status failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update user",
        500,
      );
    }
  },

  async getUserById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await adminService.getUserById(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Get user by ID failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to get user", 500);
    }
  },

  async softDeleteUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await adminService.softDeleteUser(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Soft delete user failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to delete user", 500);
    }
  },

  async verifyUserEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await adminService.verifyUserEmail(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Verify user email failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to verify email", 500);
    }
  },

  async resetUserPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await adminService.resetUserPassword(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Reset user password failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to reset password", 500);
    }
  },

  async getUserSessions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await adminService.getUserSessions(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Get user sessions failed");
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to get sessions", 500);
    }
  },

  async getAllProperties(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = adminFilterSchema.parse(request.query);

      const result = await adminService.getAllProperties({
        page: query.page,
        limit: query.limit,
        status: query.status,
        type: query.type,
        vendorId: query.vendorId,
        search: query.search,
      });

      return sendSuccess(reply, result.properties, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, "Get properties failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch properties",
        500,
      );
    }
  },

  async updatePropertyStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = propertyApprovalSchema.parse(request.body);

      const result = await adminService.updatePropertyStatus(
        id,
        data.status,
        data.reason,
      );
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Update property status failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update property",
        500,
      );
    }
  },

  async createProperty(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as any;

      const property = await adminService.createProperty(body);
      return sendSuccess(reply, property, 201);
    } catch (error: any) {
      logger.error({ error }, "Create property failed");
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create property",
        500,
      );
    }
  },

  async getPropertyById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const property = await adminService.getPropertyById(id);
      return sendSuccess(reply, property, 200);
    } catch (error: any) {
      logger.error({ error }, "Get property failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to get property details", 500);
    }
  },

  async updateProperty(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any; // Map proper zod schema if needed

      const property = await adminService.updateProperty(id, data);
      return sendSuccess(reply, property, 200);
    } catch (error: any) {
      logger.error({ error }, "Update property failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to update property", 500);
    }
  },

  async softDeleteProperty(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const deleted = await adminService.softDeleteProperty(id);
      return sendSuccess(reply, deleted, 200);
    } catch (error: any) {
      logger.error({ error }, "Soft delete property failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to delete property", 500);
    }
  },

  async getAllVendors(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const result = await adminService.getAllVendors({
        page: parseInt(query.page || "1"),
        limit: parseInt(query.limit || "10"),
        status: query.status?.toUpperCase(),
        search: query.search,
      });

      return sendSuccess(reply, result.vendors, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, "Get vendors failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch vendors",
        500,
      );
    }
  },

  async updateVendorStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { status: string; reason?: string };

      const result = await adminService.updateVendorStatus(
        id,
        body.status,
        body.reason,
      );
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Update vendor status failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update vendor",
        500,
      );
    }
  },

  async updateVendor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = adminUpdateVendorSchema.parse(request.body);

      const result = await adminService.updateVendor(id, data);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Update vendor failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update vendor",
        500,
      );
    }
  },

  async updateVendorCommission(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { rate } = updateVendorCommissionSchema.parse(request.body);

      const result = await adminService.updateVendorCommission(id, rate);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Update vendor commission failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update vendor commission",
        500,
      );
    }
  },

  async getVendorById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const vendor = await adminService.getVendorById(id);
      return sendSuccess(reply, vendor, 200);
    } catch (error: any) {
      logger.error({ error }, "Get vendor failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to get vendor details", 500);
    }
  },

  async softDeleteVendor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const deleted = await adminService.softDeleteVendor(id);
      return sendSuccess(reply, deleted, 200);
    } catch (error: any) {
      logger.error({ error }, "Soft delete vendor failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to delete vendor", 500);
    }
  },

  async getAllBookings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const result = await adminService.getAllBookings({
        page: parseInt(query.page || "1"),
        limit: parseInt(query.limit || "10"),
        status: query.status?.toUpperCase(),
        vendorId: query.vendorId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });

      return sendSuccess(reply, result.bookings, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, "Get bookings failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch bookings",
        500,
      );
    }
  },

  async refundBooking(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = bookingRefundSchema.parse(request.body);

      const result = await adminService.refundBooking(
        id,
        body.amount,
        body.reason,
      );
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Refund booking failed");
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to refund booking",
        500,
      );
    }
  },

  async getBookingById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const booking = await adminService.getBookingById(id);
      return sendSuccess(reply, booking, 200);
    } catch (error: any) {
      logger.error({ error }, "Get booking details failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to fetch booking details", 500);
    }
  },

  async updateBookingStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };
      const updated = await adminService.updateBookingStatus(id, status);
      return sendSuccess(reply, updated, 200);
    } catch (error: any) {
      logger.error({ error }, "Update booking status failed");
      if (error.code === ERROR_CODES.VALIDATION_ERROR || error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, error.code === ERROR_CODES.VALIDATION_ERROR ? 400 : 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to update booking status", 500);
    }
  },

  async getPaymentDetails(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const payment = await adminService.getPaymentDetails(id);
      return sendSuccess(reply, payment, 200);
    } catch (error: any) {
      logger.error({ error }, "Get payment details failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to fetch payment details", 500);
    }
  },

  async getAllPayouts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const result = await adminService.getAllPayouts({
        page: parseInt(query.page || "1"),
        limit: parseInt(query.limit || "10"),
        status: query.status,
      });

      return sendSuccess(reply, result.payouts, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, "Get payouts failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch payouts",
        500,
      );
    }
  },

  async getAllPayments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const result = await adminService.getAllPayments({
        page: parseInt(query.page || "1"),
        limit: parseInt(query.limit || "10"),
        status: query.status,
        search: query.search,
      });

      return sendSuccess(reply, result.payments, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, "Get payments failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch payments",
        500,
      );
    }
  },

  async getAllRefunds(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const result = await adminService.getAllRefunds({
        page: parseInt(query.page || "1"),
        limit: parseInt(query.limit || "10"),
      });

      return sendSuccess(reply, result.refunds, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, "Get refunds failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch refunds",
        500,
      );
    }
  },

  async refundPayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { amount, reason } = request.body as { amount?: number; reason?: string };

      const result = await adminService.refundPayment(id, amount, reason);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Refund payment failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to refund payment",
        500,
      );
    }
  },

  async processPayout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = payoutProcessingSchema.parse(request.body);

      const result = await adminService.processPayout(
        data.payoutId,
        data.action,
        data.notes,
      );
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Process payout failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to process payout",
        500,
      );
    }
  },

  async markPayoutPaid(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = markPayoutPaidSchema.parse(request.body);

      const result = await adminService.markPayoutPaid(
        id,
        body.transactionId,
        body.notes,
      );
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Mark payout paid failed");
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to mark payout paid",
        500,
      );
    }
  },

  async getVendorEarnings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await adminService.getVendorEarnings();
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Get vendor earnings failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch vendor earnings",
        500,
      );
    }
  },

  async createPayout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { vendorId, amount } = request.body as { vendorId: string; amount?: number };
      const result = await adminService.createPayout(vendorId, amount);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Create payout failed");
      if (error.code === ERROR_CODES.VALIDATION_ERROR) {
        return sendError(reply, error.code, error.message, 400);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create payout",
        500,
      );
    }
  },

  async updateRoom(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = adminRoomUpdateSchema.parse(request.body);

      const result = await adminService.updateRoom(
        id,
        body
      );
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Update room failed");
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update room",
        500,
      );
    }
  },

  async blockRoomDates(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = adminRoomBlockSchema.parse(request.body);

      const result = await adminService.blockRoomDates(
        id,
        body.checkInDate,
        body.checkOutDate,
        body.quantity
      );
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Block room dates failed");
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to block room dates",
        500,
      );
    }
  },

  // ─── Review Moderation ───

  async adminGetAllReviews(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const result = await reviewsService.getAllAdmin({
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 10,
        propertyId: query.propertyId,
        rating: query.rating ? parseInt(query.rating) : undefined,
        isVisible: query.isVisible !== undefined ? query.isVisible === 'true' : undefined,
        isVerified: query.isVerified !== undefined ? query.isVerified === 'true' : undefined,
      });
      return sendSuccess(reply, result.reviews, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, "Get admin reviews failed");
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to fetch reviews", 500);
    }
  },

  async getRoomInventory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { startDate, endDate } = request.query as { startDate: string; endDate: string };

      const result = await adminService.getRoomInventory(
        id,
        new Date(startDate),
        new Date(endDate)
      );
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Get room inventory failed");
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to fetch inventory", 500);
    }
  },

  async overrideRoomInventory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { date, availableRooms } = request.body as { date: string; availableRooms: number };

      const result = await adminService.overrideRoomInventory(id, new Date(date), availableRooms);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Override room inventory failed");
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to override inventory", 500);
    }
  },

  async releaseRoomLocks(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { lockId } = request.query as { lockId?: string };

      const result = await adminService.releaseRoomLocks(id, lockId);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Release room locks failed");
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to release locks", 500);
    }
  },

  async cleanupInventoryLocks(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await adminService.cleanupInventoryLocks();
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Cleanup inventory locks failed");
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to cleanup locks", 500);
    }
  },

  async adminHideReview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await reviewsService.hideReview(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Hide review failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to hide review", 500);
    }
  },

  async adminUnhideReview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await reviewsService.unhideReview(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Unhide review failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to unhide review", 500);
    }
  },

  async adminVerifyReview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await reviewsService.verifyReview(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Verify review failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to verify review", 500);
    }
  },

  async adminUpdateReviewContent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as { title?: string; comment?: string };
      const result = await reviewsService.adminUpdateReviewContent(id, data);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Admin update review content failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to update review", 500);
    }
  },

  async adminDeleteReview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await reviewsService.adminDeleteReview(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, "Admin delete review failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to delete review", 500);
    }
  },

  // ─── Export Data ───

  async exportDataCsv(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { entity } = request.params as { entity: string };
      const validEntities = ['users', 'vendors', 'properties', 'bookings', 'payouts', 'payments', 'refunds'];
      if (!validEntities.includes(entity)) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, "Invalid entity for export. Supported: " + validEntities.join(', '));
      }

      const rawData = await adminService.exportData(entity as any);
      const csvString = jsonToCsv(rawData);

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${entity}_export_${new Date().toISOString().split('T')[0]}.csv"`);
      return reply.send(csvString);
    } catch (error: any) {
      logger.error({ error }, "Export CSV failed");
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, "Failed to export data", 500);
    }
  },
};
