import { FastifyRequest, FastifyReply } from "fastify";
import servicesService from "./services.service";
import { sendSuccess, sendError } from "../../utils/response.util";
import { ERROR_CODES } from "../../constants/error-codes";
import { logger } from "../../utils/logger.util";
import {
  createServiceSchema,
  updateServiceSchema,
  serviceFilterSchema,
  serviceIdSchema,
} from "./services.schema";

export const ServicesController = {
  async getNewForm(request: FastifyRequest, reply: FastifyReply) {
    try {
      return sendSuccess(reply, { message: "Service form endpoint ready" });
    } catch (error: any) {
      logger.error({ error }, "Get new service form failed");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to load form",
        500,
      );
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createServiceSchema.parse(request.body);
      const service = await servicesService.create(data);
      return sendSuccess(reply, service, 201);
    } catch (error: any) {
      logger.error({ error }, "Create service failed");
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create service",
        500,
      );
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = serviceIdSchema.parse(request.params);
      const data = updateServiceSchema.parse(request.body);
      const service = await servicesService.update(id, data);
      return sendSuccess(reply, service);
    } catch (error: any) {
      logger.error({ error }, "Update service failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input data",
          400,
        );
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update service",
        500,
      );
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = serviceIdSchema.parse(request.params);
      await servicesService.delete(id);
      return sendSuccess(reply, { message: "Service deleted successfully" });
    } catch (error: any) {
      logger.error({ error }, "Delete service failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to delete service",
        500,
      );
    }
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = serviceIdSchema.parse(request.params);
      const service = await servicesService.getById(id);
      return sendSuccess(reply, service);
    } catch (error: any) {
      logger.error({ error }, "Get service failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch service",
        500,
      );
    }
  },

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = serviceFilterSchema.parse(request.query);
      const result = await servicesService.getAll(query);
      return sendSuccess(reply, result.services, 200, result.meta);
    } catch (error: any) {
      logger.error({ error }, "Get services failed");
      if (error.name === "ZodError") {
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query parameters",
          400,
        );
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch services",
        500,
      );
    }
  },

  async activate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = serviceIdSchema.parse(request.params);
      const service = await servicesService.activate(id);
      return sendSuccess(reply, service);
    } catch (error: any) {
      logger.error({ error }, "Activate service failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to activate service",
        500,
      );
    }
  },

  async deactivate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = serviceIdSchema.parse(request.params);
      const service = await servicesService.deactivate(id);
      return sendSuccess(reply, service);
    } catch (error: any) {
      logger.error({ error }, "Deactivate service failed");
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to deactivate service",
        500,
      );
    }
  },
};
