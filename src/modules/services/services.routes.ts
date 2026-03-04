import { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/auth.middleware";
import { ServicesController } from "./services.controller";
import { ServiceBookingsController } from "../service-bookings/service-bookings.controller";

export default async function servicesRoutes(fastify: FastifyInstance) {
  const auth = (fastify as any).authenticate;

  // Public routes (no auth required)
  fastify.get("/", ServicesController.getAll);
  fastify.get("/:id", ServicesController.getById);

  // Authenticated routes
  fastify.post("/bookings", { preHandler: [auth] }, ServiceBookingsController.create);
  fastify.get("/bookings/my", { preHandler: [auth] }, ServiceBookingsController.getMyBookings);

  // Service bookings - Admin only
  fastify.get(
    "/bookings/admin",
    { preHandler: [auth, requireRole("ADMIN")] },
    ServiceBookingsController.getAllForAdmin,
  );
  fastify.get(
    "/bookings/admin/:id",
    { preHandler: [auth, requireRole("ADMIN")] },
    ServiceBookingsController.getByIdForAdmin,
  );
  fastify.put(
    "/bookings/admin/:id/status",
    { preHandler: [auth, requireRole("ADMIN")] },
    ServiceBookingsController.updateStatus,
  );
  fastify.post(
    "/bookings/admin/:id/refund",
    { preHandler: [auth, requireRole("ADMIN")] },
    ServiceBookingsController.refund,
  );

  // Services - Admin only
  fastify.get(
    "/new",
    { preHandler: [auth, requireRole("ADMIN")] },
    ServicesController.getNewForm,
  );
  fastify.post(
    "/",
    { preHandler: [auth, requireRole("ADMIN")] },
    ServicesController.create,
  );
  fastify.put(
    "/:id",
    { preHandler: [auth, requireRole("ADMIN")] },
    ServicesController.update,
  );
  fastify.delete(
    "/:id",
    { preHandler: [auth, requireRole("ADMIN")] },
    ServicesController.delete,
  );
  fastify.post(
    "/:id/activate",
    { preHandler: [auth, requireRole("ADMIN")] },
    ServicesController.activate,
  );
  fastify.post(
    "/:id/deactivate",
    { preHandler: [auth, requireRole("ADMIN")] },
    ServicesController.deactivate,
  );
}
