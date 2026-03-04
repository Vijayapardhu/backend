export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  REFUNDED = 'REFUNDED',
}

export const CANCELLABLE_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
] as const;

export const ACTIVE_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
] as const;

export const canCancelBooking = (status: BookingStatus): boolean => {
  return CANCELLABLE_STATUSES.includes(status as any);
};

export const isActiveBooking = (status: BookingStatus): boolean => {
  return ACTIVE_STATUSES.includes(status as any);
};
