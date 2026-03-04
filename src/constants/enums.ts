export const ROLES = {
  USER: 'USER',
  VENDOR: 'VENDOR',
  ADMIN: 'ADMIN',
} as const;

export const PROPERTY_TYPES = {
  HOTEL: 'HOTEL',
  HOME: 'HOME',
  TEMPLE: 'TEMPLE',
} as const;

export const PROPERTY_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  REJECTED: 'REJECTED',
} as const;

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  REFUNDED: 'REFUNDED',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;

export const PAYMENT_METHOD = {
  RAZORPAY: 'RAZORPAY',
  UPI: 'UPI',
  CARD: 'CARD',
  NETBANKING: 'NETBANKING',
  WALLET: 'WALLET',
  CASH: 'CASH',
} as const;

export const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  REVIEW_RECEIVED: 'review_received',
  VENDOR_APPROVED: 'vendor_approved',
  PROPERTY_APPROVED: 'property_approved',
  PROPERTY_REJECTED: 'property_rejected',
  REFUND_PROCESSED: 'refund_processed',
} as const;

export const AMENITIES = [
  'wifi',
  'parking',
  'pool',
  'gym',
  'restaurant',
  'room-service',
  'ac',
  'tv',
  'laundry',
  'kitchen',
  'garden',
  'balcony',
  'mini-bar',
  'coffee-maker',
  'hair-dryer',
  'iron',
  'safe',
  'wheelchair',
  'pets-allowed',
  'prayer-room',
  'temple-tours',
] as const;

export const ROOM_TYPES = [
  'standard',
  'deluxe',
  'suite',
  'family',
  'dormitory',
] as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type PropertyType = (typeof PROPERTY_TYPES)[keyof typeof PROPERTY_TYPES];
export type PropertyStatus = (typeof PROPERTY_STATUS)[keyof typeof PROPERTY_STATUS];
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
export type Amenity = (typeof AMENITIES)[keyof typeof AMENITIES];
export type RoomType = (typeof ROOM_TYPES)[keyof typeof ROOM_TYPES];
