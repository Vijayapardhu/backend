import { z } from 'zod';

export const createServiceBookingSchema = z.object({
  serviceId: z.string().uuid().optional(),
  serviceName: z.string().min(2).max(120),
  serviceCategory: z.string().min(2).max(80).optional(),
  serviceDate: z.string().datetime(),
  serviceTime: z.string().min(3).max(20),
  location: z.string().min(5).max(300),
  notes: z.string().max(2000).optional(),
  advanceAmount: z.coerce.number().positive(),
  totalAmount: z.coerce.number().positive().optional(),
  razorpayPaymentId: z.string().min(5),
  razorpayOrderId: z.string().min(5).optional(),
});

export const serviceBookingFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(['ADVANCE_PAID', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const updateServiceBookingStatusSchema = z.object({
  status: z.enum(['ADVANCE_PAID', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
  cancellationReason: z.string().max(500).optional(),
});

export const serviceBookingRefundSchema = z.object({
  amount: z.coerce.number().positive(),
  reason: z.string().max(500).optional(),
});

export const serviceBookingIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateServiceBookingInput = z.infer<typeof createServiceBookingSchema>;
