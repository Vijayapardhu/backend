import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { ZodSchema } from 'zod';
import { sendError } from '../utils/response.util';
import { ERROR_CODES } from '../constants/error-codes';

export const validateBody = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error: any) {
      const details: Record<string, string[]> = {};
      error.errors?.forEach((err: any) => {
        const path = err.path.join('.');
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(err.message);
      });

      return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', 400, details);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query) as any;
    } catch (error: any) {
      const details: Record<string, string[]> = {};
      error.errors?.forEach((err: any) => {
        const path = err.path.join('.');
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(err.message);
      });

      return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', 400, details);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params) as any;
    } catch (error: any) {
      const details: Record<string, string[]> = {};
      error.errors?.forEach((err: any) => {
        const path = err.path.join('.');
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(err.message);
      });

      return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', 400, details);
    }
  };
};
