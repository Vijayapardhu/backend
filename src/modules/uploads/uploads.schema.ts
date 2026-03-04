import { z } from 'zod';

export const uploadSchema = z.object({
  folder: z.string().default('hosthaven'),
  resourceType: z.enum(['image', 'video', 'raw', 'auto']).default('image'),
});

export const uploadMultipleSchema = z.object({
  folder: z.string().default('hosthaven'),
  resourceType: z.enum(['image', 'video', 'raw', 'auto']).default('image'),
  maxFiles: z.coerce.number().int().min(1).max(10).default(5),
});

export type UploadInput = z.infer<typeof uploadSchema>;
export type UploadMultipleInput = z.infer<typeof uploadMultipleSchema>;
