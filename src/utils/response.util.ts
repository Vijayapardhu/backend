import { FastifyReply } from 'fastify';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    [key: string]: any;
  };
  timestamp: string;
  requestId?: string;
}

export const sendSuccess = <T>(
  reply: FastifyReply,
  data: T,
  statusCode: number = 200,
  meta?: ApiResponse<T>['meta']
): FastifyReply => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  if (meta) {
    response.meta = meta;
  }

  return reply.status(statusCode).send(response);
};

export const sendError = (
  reply: FastifyReply,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, string[]>
): FastifyReply => {
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };

  return reply.status(statusCode).send(response);
};

export const paginate = (
  total: number,
  page: number,
  limit: number
): ApiResponse<unknown>['meta'] => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};
