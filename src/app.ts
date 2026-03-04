import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import multipart from "@fastify/multipart";
import { config, isDevelopment, isProduction } from "./config";
import { logger } from "./utils/logger.util";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { authMiddleware } from "./middleware/auth.middleware";
import authRoutes from "./modules/auth/auth.routes";
import propertiesRoutes from "./modules/properties/properties.routes";
import roomsRoutes from "./modules/rooms/rooms.routes";
import templesRoutes from "./modules/temples/temples.routes";
import bookingsRoutes from "./modules/bookings/bookings.routes";
import paymentsRoutes from "./modules/payments/payments.routes";
import reviewsRoutes from "./modules/reviews/reviews.routes";
import wishlistRoutes from "./modules/wishlist/wishlist.routes";
import vendorRoutes from "./modules/vendor/vendor.routes";
import adminRoutes from "./modules/admin/admin.routes";
import uploadsRoutes from "./modules/uploads/uploads.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import servicesRoutes from "./modules/services/services.routes";
import supportRoutes from "./modules/support/support.routes";
import pushRoutes from "./modules/push/push.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import adminService from "./modules/admin/admin.service";

export const buildApp = async () => {
  const fastify = Fastify({
    logger: isDevelopment
      ? {
        level: config.logging.level,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            levelFirst: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
      : { level: config.logging.level },
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
    bodyLimit: 100 * 1024 * 1024, // 100MB
  });

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  // Register authentication decorator
  fastify.decorate("authenticate", authMiddleware);

  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: isProduction
      ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", config.app.frontendUrl],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
        },
      }
      : false,
    crossOriginEmbedderPolicy: false,
  });

  // CORS
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow all origins in development, or specific origins in production
      if (isProduction) {
        const allowedOrigins = [
          config.app.frontendUrl,
          process.env.ADMIN_URL || "https://admin.hosthaven.in",
        ].filter(Boolean);
        if (!origin || allowedOrigins.includes(origin)) {
          cb(null, true);
        } else {
          cb(new Error("Not allowed"), false);
        }
      } else {
        // In development, allow all origins
        cb(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Request-Id",
      "Cache-Control",
      "Pragma",
    ],
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    cache: 10000,
    allowList: isDevelopment ? ["127.0.0.1", "::1"] : [],
    keyGenerator: (request) => {
      return request.user?.id || request.ip;
    },
    skipOnError: true,
  });

  // Swagger documentation
  if (isDevelopment) {
    await fastify.register(swagger, {
      openapi: {
        openapi: "3.0.0",
        info: {
          title: "HostHaven API",
          description: "Travel and Heritage Tourism Platform API",
          version: "1.0.0",
        },
        servers: [
          {
            url: `http://localhost:${config.app.port}/${config.app.apiVersion}`,
            description: "Development server",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
    });

    await fastify.register(swaggerUI, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: true,
      },
    });
  }

  // Health check
  fastify.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: config.app.apiVersion,
  }));

  // Public homepage config endpoint (no auth)
  fastify.get(`/${config.app.apiVersion}/settings/homepage`, async (request, reply) => {
    try {
      const homepageConfig = await adminService.getHomepageConfig();
      return { success: true, data: homepageConfig };
    } catch (error) {
      return { success: true, data: null };
    }
  });

  // API routes
  await fastify.register(authRoutes, {
    prefix: `/${config.app.apiVersion}/auth`,
  });
  await fastify.register(propertiesRoutes, {
    prefix: `/${config.app.apiVersion}/properties`,
  });
  await fastify.register(roomsRoutes, {
    prefix: `/${config.app.apiVersion}/rooms`,
  });
  await fastify.register(templesRoutes, {
    prefix: `/${config.app.apiVersion}/temples`,
  });
  await fastify.register(bookingsRoutes, {
    prefix: `/${config.app.apiVersion}/bookings`,
  });
  await fastify.register(paymentsRoutes, {
    prefix: `/${config.app.apiVersion}/payments`,
  });
  await fastify.register(reviewsRoutes, {
    prefix: `/${config.app.apiVersion}/reviews`,
  });
  await fastify.register(wishlistRoutes, {
    prefix: `/${config.app.apiVersion}/wishlist`,
  });
  await fastify.register(vendorRoutes, {
    prefix: `/${config.app.apiVersion}/vendor`,
  });
  await fastify.register(adminRoutes, {
    prefix: `/${config.app.apiVersion}/admin`,
  });
  await fastify.register(uploadsRoutes, {
    prefix: `/${config.app.apiVersion}/uploads`,
  });
  await fastify.register(notificationsRoutes, {
    prefix: `/${config.app.apiVersion}/notifications`,
  });
  await fastify.register(servicesRoutes, {
    prefix: `/${config.app.apiVersion}/services`,
  });
  await fastify.register(inventoryRoutes, {
    prefix: `/${config.app.apiVersion}/inventory`,
  });
  await fastify.register(supportRoutes, {
    prefix: `/${config.app.apiVersion}/support`,
  });
  await fastify.register(pushRoutes, { prefix: `/${config.app.apiVersion}` });

  // Error handlers
  fastify.setErrorHandler(errorHandler);
  fastify.setNotFoundHandler(notFoundHandler);

  return fastify;
};

export default buildApp;
