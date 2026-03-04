import { z } from 'zod';

export const createTempleDetailsSchema = z.object({
  propertyId: z.string().uuid(),
  deity: z.string().min(2).max(100),
  templeType: z.string().max(50).optional(),
  builtYear: z.string().max(20).optional(),
  architecture: z.string().max(500).optional(),
  darshanTimings: z.array(z.object({
    day: z.string(),
    openTime: z.string(),
    closeTime: z.string(),
  })).default([]),
  aartiTimings: z.array(z.object({
    name: z.string(),
    time: z.string(),
    day: z.string().optional(),
  })).default([]),
  specialEvents: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    date: z.string(),
    time: z.string().optional(),
  })).default([]),
  dressCode: z.string().max(200).optional(),
  entryFee: z.array(z.object({
    type: z.string(),
    amount: z.coerce.number(),
    description: z.string().optional(),
  })).default([]),
  photography: z.boolean().default(true),
  bestTimeToVisit: z.string().max(500).optional(),
  festivals: z.array(z.object({
    name: z.string(),
    date: z.string(),
    description: z.string().optional(),
  })).default([]),
});

export const updateTempleDetailsSchema = createTempleDetailsSchema.partial();

export const templeDetailsIdSchema = z.object({
  id: z.string().uuid(),
});

export const templeFilterSchema = z.object({
  deity: z.string().optional(),
  templeType: z.string().optional(),
  state: z.string().optional(),
});

export type CreateTempleDetailsInput = z.infer<typeof createTempleDetailsSchema>;
export type UpdateTempleDetailsInput = z.infer<typeof updateTempleDetailsSchema>;
