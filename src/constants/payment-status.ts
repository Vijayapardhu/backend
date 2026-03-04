export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export const SUCCESS_STATUSES = [PaymentStatus.COMPLETED] as const;

export const FAILED_STATUSES = [PaymentStatus.FAILED] as const;

export const REFUND_STATUSES = [
  PaymentStatus.REFUNDED,
  PaymentStatus.PARTIALLY_REFUNDED,
] as const;

export const isPaymentSuccessful = (status: PaymentStatus): boolean => {
  return SUCCESS_STATUSES.includes(status as any);
};

export const isPaymentFailed = (status: PaymentStatus): boolean => {
  return FAILED_STATUSES.includes(status as any);
};

export const isRefundable = (status: PaymentStatus): boolean => {
  return status === PaymentStatus.COMPLETED;
};
