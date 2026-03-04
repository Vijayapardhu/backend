import { z } from 'zod'

export const inventoryLockSchema = z.object({
  roomId: z.string().uuid(),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  quantity: z.coerce.number().int().positive().default(1),
})

export const inventoryReleaseSchema = z.object({
  roomId: z.string().uuid(),
})

export const inventoryQuerySchema = z.object({
  roomId: z.string().uuid(),
  date: z.string().datetime(),
})

export type InventoryLockInput = z.infer<typeof inventoryLockSchema>
export type InventoryReleaseInput = z.infer<typeof inventoryReleaseSchema>
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>
