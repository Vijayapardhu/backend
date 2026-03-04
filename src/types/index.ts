import { FastifyRequest } from 'fastify';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'VENDOR' | 'ADMIN';
  vendorId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PropertyFilters {
  type?: string;
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  rating?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BookingFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ReviewFilters {
  rating?: number;
}

export type FileUpload = {
  filename: string;
  data: Buffer;
  mimetype?: string;
  encoding?: string;
};

export interface EmailJobData {
  type: string;
  [key: string]: any;
}
