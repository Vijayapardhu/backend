import { z } from 'zod';

const cityEnum = z.enum(['VIJAYAWADA', 'NANDIYALA', 'VETLAPALEM', 'TIRUPATI']);
const propertyStatusEnum = z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']);

const mediaImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().max(180).optional(),
  isPrimary: z.boolean().optional(),
});

const roomSchema = z.object({
  roomName: z.string().min(2).max(120),
  capacity: z.number().int().min(1).max(20),
  extraBedCapacity: z.number().int().min(0).max(10).default(0),
  pricePerNight: z.number().positive(),
  weekendPrice: z.number().positive().optional(),
  totalRooms: z.number().int().min(1).max(500),
  roomAmenities: z.array(z.string().min(1).max(80)).min(1),
  roomImages: z.array(z.string().url()).min(1),
});

const blockDateSchema = z.object({
  date: z.string().date(),
  blockedRooms: z.number().int().min(0).optional(),
});

const adminControlsSchema = z.object({
  commissionRate: z.number().min(0).max(100).default(10),
  approvalStatus: propertyStatusEnum.default('PENDING'),
  suspensionStatus: z.boolean().default(false),
  vendorApproved: z.boolean().default(false),
});

export const registerVendorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  businessName: z.string().min(2).max(200),
  businessAddress: z.string().max(500).optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/).optional(),
  bankAccount: z.object({
    bankName: z.string().min(2).max(100),
    accountNumber: z.string().min(9).max(18),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    accountHolderName: z.string().min(2).max(100),
  }).optional(),
});

export const updateVendorSchema = z.object({
  businessName: z.string().min(2).max(200).optional(),
  businessAddress: z.string().max(500).optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/).optional(),
  bankAccount: z.object({
    bankName: z.string().min(2).max(100),
    accountNumber: z.string().min(9).max(18),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    accountHolderName: z.string().min(2).max(100),
  }).optional(),
});

export const vendorLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const vendorIdSchema = z.object({
  id: z.string().uuid(),
});

export const vendorFilterSchema = z.object({
  isApproved: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const adminCreateVendorOnboardingSchema = z.object({
  account: z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(100),
    phoneNumber: z.string().regex(/^[6-9]\d{9}$/),
    businessName: z.string().min(2).max(200),
  }),
  businessInfo: z.object({
    businessAddress: z.string().min(5).max(500),
    city: cityEnum,
    state: z.string().min(2).max(100),
    pincode: z.string().regex(/^\d{6}$/),
    gstNumber: z
      .string()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
      .optional(),
    panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
  }),
  payout: z.object({
    bankName: z.string().min(2).max(100),
    accountHolderName: z.string().min(2).max(120),
    accountNumber: z.string().min(9).max(20),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    upiId: z.string().max(120).optional(),
  }),
  hotel: z.object({
    hotelName: z.string().min(2).max(200),
    slug: z.string().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().min(40).max(10000),
    shortDescription: z.string().min(10).max(300),
    fullAddress: z.string().min(5).max(600),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    amenities: z.array(z.string().min(1).max(80)).min(1),
    highlights: z.array(z.string().min(1).max(120)).optional(),
    images: z.array(mediaImageSchema).min(5),
    videos: z.array(z.string().url()).min(1),
    basePrice: z.number().positive(),
  }),
  rooms: z.array(roomSchema).min(1),
  inventory: z.object({
    totalRoomsAvailable: z.number().int().min(1).max(2000),
    blockDates: z.array(blockDateSchema).optional(),
  }),
  legal: z.object({
    acceptTerms: z.literal(true),
    acceptCommission: z.literal(true),
    acceptRefundPolicy: z.literal(true),
  }),
  adminControls: adminControlsSchema.optional(),
});

export type RegisterVendorInput = z.infer<typeof registerVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type VendorLoginInput = z.infer<typeof vendorLoginSchema>;
export type AdminCreateVendorOnboardingInput = z.infer<typeof adminCreateVendorOnboardingSchema>;
