import { z } from 'zod'

export const createServiceSchema = z.object({
  name: z.string().min(2, 'Service name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  basePrice: z.number().min(0, 'Base price must be positive'),
  advanceType: z.enum(['percentage', 'fixed']).default('percentage'),
  advanceValue: z.number().min(0).default(30),
  images: z.array(z.string()).optional(),
  active: z.boolean().default(true),
})

export const updateServiceSchema = createServiceSchema.partial()

export const serviceFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  category: z.string().optional(),
  active: z.coerce.boolean().optional(),
})

export const serviceIdSchema = z.object({
  id: z.string().uuid(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
export type ServiceFilterInput = z.infer<typeof serviceFilterSchema>
