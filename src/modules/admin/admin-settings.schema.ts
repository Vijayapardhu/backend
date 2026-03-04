import { z } from 'zod'

export const payoutFrequencySchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY'])

export const platformSettingsSchema = z.object({
  platformName: z.string().min(2).max(120),
  commissionRate: z.coerce.number().min(0).max(100),
  supportEmail: z.string().email(),
  supportPhone: z.string().min(6).max(20),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  minPayoutAmount: z.coerce.number().min(0),
  payoutFrequency: payoutFrequencySchema,
  emailTemplates: z.array(z.any()).optional(),
  featureFlags: z.array(z.any()).optional(),
})

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>
