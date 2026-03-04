import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../utils/response.util';
import { ERROR_CODES } from '../constants/error-codes';
import { logger } from '../utils/logger.util';
import { ZodError } from 'zod';

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const requestId = request.id;
  
  // Log the error
  logger.error({
    requestId,
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
    },
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
    },
  }, 'Request error');

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(err.message);
    });

    return reply.status(400).send({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details,
      },
      timestamp: new Date().toISOString(),
      requestId,
    });
  }

  // Handle known error codes
  if ((error as any).code) {
    const errorCode = (error as any).code;
    const statusCode = error.statusCode || 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: errorCode,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
      requestId,
    });
  }

  // Handle Fastify errors
  if (error.statusCode) {
    const message = 
      error.statusCode === 401 ? 'Unauthorized' :
      error.statusCode === 403 ? 'Forbidden' :
      error.statusCode === 404 ? 'Not Found' :
      error.statusCode === 429 ? 'Too Many Requests' :
      error.message;

    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message,
      },
      timestamp: new Date().toISOString(),
      requestId,
    });
  }

  // Handle unknown errors
  return reply.status(500).send({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
    timestamp: new Date().toISOString(),
    requestId,
  });
};

export const notFoundHandler = (request: FastifyRequest, reply: FastifyReply) => {
  return reply.status(404).send({
    success: false,
    error: {
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      message: `Route ${request.method} ${request.url} not found`,
    },
    timestamp: new Date().toISOString(),
    requestId: request.id,
  });
};
