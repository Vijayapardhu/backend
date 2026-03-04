import { z } from "zod";

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const propertyApprovalSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "REJECTED"]),
  reason: z.string().max(500).optional(),
});

export const systemStatsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const statusEnum = z.enum([
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
  "PENDING",
  "DRAFT",
]);
const typeEnum = z.enum(["HOTEL", "HOME", "TEMPLE"]);

export const adminFilterSchema = z
  .object({
    status: statusEnum.optional(),
    type: typeEnum.optional(),
    vendorId: z.string().uuid().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
  })
  .transform((data) => ({
    ...data,
    status: data.status?.toUpperCase() as
      | "ACTIVE"
      | "INACTIVE"
      | "REJECTED"
      | "PENDING"
      | "DRAFT"
      | undefined,
    type: data.type?.toUpperCase() as "HOTEL" | "HOME" | "TEMPLE" | undefined,
  }));

export const payoutProcessingSchema = z.object({
  payoutId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

export const bookingRefundSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().max(500).optional(),
});

export const markPayoutPaidSchema = z.object({
  transactionId: z.string().min(3).max(120),
  notes: z.string().max(500).optional(),
});

export const adminRoomUpdateSchema = z.object({
  pricePerNight: z.coerce.number().positive().optional(),
  weekendPrice: z.coerce.number().positive().optional(),
  totalRooms: z.coerce.number().int().nonnegative().optional(),
  availableRooms: z.coerce.number().int().nonnegative().optional(),
  isActive: z.boolean().optional()
});

export const adminRoomBlockSchema = z.object({
  checkInDate: z.string().transform((str) => new Date(str)),
  checkOutDate: z.string().transform((str) => new Date(str)),
  quantity: z.coerce.number().int().positive().default(1),
  notes: z.string().max(200).optional(),
});

export const analyticsSchema = z.object({
  range: z.enum(["7d", "30d", "3m"]).default("30d"),
});

export const adminUpdateVendorSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  businessName: z.string().min(2).max(200).optional(),
  businessAddress: z.string().max(500).optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/).optional(),
  passportPhoto: z.string().url().optional(),
  companyLogo: z.string().url().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  bankAccount: z.object({
    bankName: z.string().min(2).max(100),
    accountNumber: z.string().min(9).max(18),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    accountHolderName: z.string().min(2).max(100),
  }).optional(),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type PropertyApprovalInput = z.infer<typeof propertyApprovalSchema>;
export type SystemStatsInput = z.infer<typeof systemStatsSchema>;
export type AdminFilterInput = z.infer<typeof adminFilterSchema>;
export type PayoutProcessingInput = z.infer<typeof payoutProcessingSchema>;
export type BookingRefundInput = z.infer<typeof bookingRefundSchema>;
export type MarkPayoutPaidInput = z.infer<typeof markPayoutPaidSchema>;
export type AdminRoomUpdateInput = z.infer<typeof adminRoomUpdateSchema>;
export type AdminRoomBlockInput = z.infer<typeof adminRoomBlockSchema>;
export type AnalyticsInput = z.infer<typeof analyticsSchema>;
export type AdminUpdateVendorInput = z.infer<typeof adminUpdateVendorSchema>;

export const updateVendorCommissionSchema = z.object({
  rate: z.number().min(0).max(100),
});
export type UpdateVendorCommissionInput = z.infer<typeof updateVendorCommissionSchema>;
