import { z } from 'zod';

export const addToWishlistSchema = z.object({
  itemType: z.enum(['hotel', 'home', 'temple']),
  itemId: z.string().uuid(),
  itemName: z.string().min(2).max(200),
  itemImage: z.string().url(),
  itemLocation: z.string().min(2).max(200),
  itemPrice: z.coerce.number().positive().optional(),
  itemRating: z.coerce.number().min(0).max(5).optional(),
});

export const wishlistFilterSchema = z.object({
  itemType: z.enum(['hotel', 'home', 'temple']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const wishlistIdSchema = z.object({
  id: z.string().uuid(),
});

export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;
export type WishlistFilterInput = z.infer<typeof wishlistFilterSchema>;
