import { z } from 'zod';
import { paginationSchema } from '../../utils/validators.util';

export const createBookingSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  checkInDate: z.string().datetime(),
  checkOutDate: z.string().datetime(),
  adults: z.coerce.number().int().min(1).max(20).default(1),
  children: z.coerce.number().int().min(0).max(10).default(0),
  extraBeds: z.coerce.number().int().min(0).max(5).default(0),
  specialRequests: z.string().max(1000).optional(),
  guestDetails: z.array(z.object({
    name: z.string().min(2).max(100),
    age: z.coerce.number().int().min(0).max(120),
    gender: z.enum(['male', 'female', 'other']),
    idProof: z.string().optional(),
  })).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const bookingFilterSchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REFUNDED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const bookingIdSchema = z.object({
  id: z.string().uuid(),
});

export const checkPriceSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  guests: z.coerce.number().int().min(1).default(1),
  extraBeds: z.coerce.number().int().min(0).default(0),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type BookingFilterInput = z.infer<typeof bookingFilterSchema>;
export type CheckPriceInput = z.infer<typeof checkPriceSchema>;
