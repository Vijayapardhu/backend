import { z } from 'zod';

export const createRoomSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  type: z.string().min(1).max(50),
  capacity: z.coerce.number().int().min(1).max(20).default(2),
  extraBedCapacity: z.coerce.number().int().min(0).max(10).default(0),
  sizeSqm: z.coerce.number().positive().optional(),
  pricePerNight: z.coerce.number().positive(),
  weekendPrice: z.coerce.number().positive().optional(),
  seasonalPricing: z.array(z.object({
    startDate: z.string(),
    endDate: z.string(),
    price: z.coerce.number().positive(),
  })).optional(),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })).default([]),
  totalRooms: z.coerce.number().int().min(1).default(1),
  availableRooms: z.coerce.number().int().min(0).default(1),
});

export const updateRoomSchema = createRoomSchema.partial();

export const roomIdSchema = z.object({
  id: z.string().uuid(),
});

export const roomFilterSchema = z.object({
  propertyId: z.string().uuid(),
  type: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type RoomFilterInput = z.infer<typeof roomFilterSchema>;
