import { z } from 'zod';
import { paginationSchema } from '../../utils/validators.util';

const dbCityEnum = z.enum(['VIJAYAWADA', 'NANDIYALA', 'VETLAPALEM', 'TIRUPATI']);

const normalizeCityValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase().replace(/[_\s-]+/g, '');
  const cityMap: Record<string, z.infer<typeof dbCityEnum>> = {
    vijayawada: 'VIJAYAWADA',
    nandiyala: 'NANDIYALA',
    nandyal: 'NANDIYALA',
    vetlapalem: 'VETLAPALEM',
    tirupati: 'TIRUPATI',
  };

  return cityMap[normalized] ?? value;
};

export const allowedCitySchema = z.preprocess(normalizeCityValue, dbCityEnum);

export const createPropertySchema = z.object({
  type: z.enum(['HOTEL', 'HOME', 'TEMPLE']),
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  shortDesc: z.string().max(200).optional(),
  address: z.string().min(5).max(500),
  city: allowedCitySchema,
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })).min(1).max(20),
  amenities: z.array(z.string()).min(1).max(50),
  highlights: z.array(z.string()).optional(),
  basePrice: z.coerce.number().positive(),
  metaTitle: z.string().max(100).optional(),
  metaDesc: z.string().max(200).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const propertyFilterSchema = paginationSchema.extend({
  type: z.enum(['HOTEL', 'HOME', 'TEMPLE']).optional(),
  city: allowedCitySchema.optional(),
  state: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  amenities: z.string().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  guests: z.coerce.number().int().positive().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().positive().optional(),
  search: z.string().optional(),
});

export const propertyIdSchema = z.object({
  id: z.string().uuid(),
});

export const availabilitySchema = z.object({
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  roomId: z.string().uuid().optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyFilterInput = z.infer<typeof propertyFilterSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
