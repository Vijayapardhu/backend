import { FastifyInstance } from "fastify";
import { PropertiesController } from "./properties.controller";
import { requireRole } from "../../middleware/auth.middleware";

export default async function propertiesRoutes(fastify: FastifyInstance) {
  // Public routes
  fastify.get("/", PropertiesController.getAll);
  fastify.get("/featured", PropertiesController.getFeatured);
  fastify.get("/cities", PropertiesController.getCities);
  fastify.get("/search", PropertiesController.search);
  fastify.get("/:id", PropertiesController.getById);
  fastify.get("/:id/availability", PropertiesController.checkAvailability);

  // Protected routes - Vendor only
  fastify.post(
    "/",
    { preHandler: [fastify.authenticate, requireRole("VENDOR")] },
    PropertiesController.create,
  );

  fastify.put(
    "/:id",
    { preHandler: [fastify.authenticate, requireRole("VENDOR", "ADMIN")] },
    PropertiesController.update,
  );

  fastify.delete(
    "/:id",
    { preHandler: [fastify.authenticate, requireRole("VENDOR", "ADMIN")] },
    PropertiesController.delete,
  );
}
