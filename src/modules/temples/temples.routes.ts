import { FastifyInstance } from "fastify";
import { TemplesController } from "./temples.controller";
import { authMiddleware, requireRole } from "../../middleware/auth.middleware";

export default async function templesRoutes(fastify: FastifyInstance) {
  fastify.get("/", TemplesController.getTemples);

  fastify.post(
    "/ai/autofill",
    { preHandler: [authMiddleware, requireRole("ADMIN")] },
    TemplesController.aiAutofill,
  );

  fastify.get("/:idOrSlug", TemplesController.getById);

  fastify.post(
    "/",
    { preHandler: [authMiddleware, requireRole("ADMIN")] },
    TemplesController.create,
  );

  fastify.put(
    "/:id",
    { preHandler: [authMiddleware, requireRole("ADMIN")] },
    TemplesController.update,
  );

  fastify.patch(
    "/:id/activate",
    { preHandler: [authMiddleware, requireRole("ADMIN")] },
    TemplesController.activate,
  );

  fastify.patch(
    "/:id/deactivate",
    { preHandler: [authMiddleware, requireRole("ADMIN")] },
    TemplesController.deactivate,
  );

  fastify.delete(
    "/:id",
    { preHandler: [authMiddleware, requireRole("ADMIN")] },
    TemplesController.delete,
  );
}
