import { z } from 'zod';

export const createSupportTicketSchema = z.object({
  category: z.string().min(2).max(80),
  bookingReference: z.string().max(80).optional(),
  message: z.string().min(5).max(3000),
  attachmentUrl: z.string().url().optional(),
});

export const supportFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
});

export const supportTicketIdSchema = z.object({
  id: z.string().uuid(),
});

export const updateSupportTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  adminNotes: z.string().max(2000).optional(),
});
