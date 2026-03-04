import { FastifyRequest, FastifyReply } from 'fastify';
import propertiesService from './properties.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { ERROR_CODES } from '../../constants/error-codes';
import { logger } from '../../utils/logger.util';
import {
  createPropertySchema,
  updatePropertySchema,
  propertyFilterSchema,
  propertyIdSchema,
  availabilitySchema,
} from './properties.schema';

export const PropertiesController = {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = propertyFilterSchema.parse(request.query);
      const amenities = query.amenities ? query.amenities.split(',') : undefined;
      const result = await propertiesService.getAll({
        page: query.page,
        limit: query.limit,
        type: query.type,
        city: query.city,
        state: query.state,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        amenities,
        rating: query.rating,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        lat: query.lat,
        lng: query.lng,
        radius: query.radius,
      });
      return sendSuccess(reply, result.properties, 200, result.meta);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        // Return 400 for validation errors with details
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, error.message, 400, error.issues || error.errors);
      }
      logger.error({
        error: error,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        code: error.code,
        name: error.name,
      }, 'Get properties failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, error.message || 'Failed to fetch properties', 500);
    }
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = propertyIdSchema.parse(request.params);
      const property = await propertiesService.getById(id);
      return sendSuccess(reply, property);
    } catch (error: any) {
      logger.error({ error }, 'Get property failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch property', 500);
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createPropertySchema.parse(request.body);
      const user = (request as any).user;

      if (user.role === 'VENDOR') {
        data.type = 'HOTEL';
      }

      if (data.type === 'HOME' && user.role !== 'ADMIN') {
        return sendError(reply, ERROR_CODES.FORBIDDEN, 'Only admin can manage homes', 403);
      }

      const property = await propertiesService.create({
        ...data,
        vendorId: user.role === 'VENDOR' ? user.vendorId : undefined,
      });

      return sendSuccess(reply, property, 201);
    } catch (error: any) {
      logger.error({ error }, 'Create property failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to create property', 500);
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = propertyIdSchema.parse(request.params);
      const data = updatePropertySchema.parse(request.body);
      const user = (request as any).user;
      const vendorId = user.role === 'VENDOR' ? user.id : undefined;

      const property = await propertiesService.update(id, data, vendorId);
      return sendSuccess(reply, property);
    } catch (error: any) {
      logger.error({ error }, 'Update property failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.code === ERROR_CODES.FORBIDDEN) {
        return sendError(reply, error.code, error.message, 403);
      }
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid input data', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to update property', 500);
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = propertyIdSchema.parse(request.params);
      const result = await propertiesService.delete(id);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Delete property failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to delete property', 500);
    }
  },

  async checkAvailability(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = propertyIdSchema.parse(request.params);
      const query = availabilitySchema.parse(request.query);

      const result = await propertiesService.checkAvailability(
        id,
        new Date(query.checkIn),
        new Date(query.checkOut),
        query.roomId
      );

      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Check availability failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to check availability', 500);
    }
  },

  async getFeatured(request: FastifyRequest, reply: FastifyReply) {
    try {
      const limit = parseInt((request.query as any).limit) || 6;
      const properties = await propertiesService.getFeatured(limit);
      return sendSuccess(reply, properties);
    } catch (error: any) {
      logger.error({ error }, 'Get featured properties failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch featured properties', 500);
    }
  },

  async getCities(request: FastifyRequest, reply: FastifyReply) {
    try {
      const cities = await propertiesService.getCities();
      return sendSuccess(reply, cities);
    } catch (error: any) {
      logger.error({ error }, 'Get cities failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch cities', 500);
    }
  },

  async search(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { q, limit } = request.query as { q?: string; limit?: string };
      
      if (!q) {
        return sendSuccess(reply, []);
      }

      const properties = await propertiesService.search(q, parseInt(limit || '10'));
      return sendSuccess(reply, properties);
    } catch (error: any) {
      logger.error({ error }, 'Search properties failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to search properties', 500);
    }
  },

  async getVendorProperties(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const query = propertyFilterSchema.parse(request.query);
      
      const amenities = query.amenities ? query.amenities.split(',') : undefined;

      const result = await propertiesService.getAll({
        page: query.page,
        limit: query.limit,
        vendorId: user.id,
        type: 'HOTEL',
        city: query.city,
        state: query.state,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        amenities,
        rating: query.rating,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

      return sendSuccess(reply, result.properties, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, 'Get vendor properties failed');
      if (error.name === 'ZodError') {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid query parameters', 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch properties', 500);
    }
  },
};
