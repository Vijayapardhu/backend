import { z } from 'zod';

export const createNotificationSchema = z.object({
  type: z.string(),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(1000),
  data: z.record(z.any()).optional(),
});

export const notificationFilterSchema = z.object({
  isRead: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const notificationIdSchema = z.object({
  id: z.string().uuid(),
});

export const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type NotificationFilterInput = z.infer<typeof notificationFilterSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
