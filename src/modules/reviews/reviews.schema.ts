import { z } from 'zod';

export const createReviewSchema = z.object({
  propertyId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().min(10).max(2000),
  cleanliness: z.coerce.number().int().min(1).max(5).optional(),
  service: z.coerce.number().int().min(1).max(5).optional(),
  location: z.coerce.number().int().min(1).max(5).optional(),
  value: z.coerce.number().int().min(1).max(5).optional(),
  images: z.array(z.string().url()).default([]),
  videos: z.array(z.string().url()).default([]),
});

export const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().max(100).optional(),
  comment: z.string().min(10).max(2000).optional(),
  cleanliness: z.coerce.number().int().min(1).max(5).optional(),
  service: z.coerce.number().int().min(1).max(5).optional(),
  location: z.coerce.number().int().min(1).max(5).optional(),
  value: z.coerce.number().int().min(1).max(5).optional(),
  images: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
});

export const reviewFilterSchema = z.object({
  propertyId: z.string().uuid().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const reviewIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReviewFilterInput = z.infer<typeof reviewFilterSchema>;
