import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import { verifyAccessToken } from "../utils/token.util";
import { sendError } from "../utils/response.util";
import { ERROR_CODES } from "../constants/error-codes";
import { logger } from "../utils/logger.util";
import prisma from "../config/database";

import { AuthUser } from "../types";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
  interface FastifyInstance {
    authenticate: any;
  }
}

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(
        reply,
        ERROR_CODES.UNAUTHORIZED,
        "Authorization header missing",
        401,
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return sendError(
        reply,
        ERROR_CODES.INVALID_TOKEN,
        "Invalid or expired token",
        401,
      );
    }

    request.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as AuthUser["role"],
    };

    if (decoded.role === "VENDOR") {
      const vendor = await prisma.vendor.findUnique({
        where: { userId: decoded.userId },
        select: { id: true },
      });
      if (vendor && request.user) {
        request.user.vendorId = vendor.id;
      }
    }
  } catch (error) {
    logger.error({ error }, "Auth middleware error");
    return sendError(
      reply,
      ERROR_CODES.UNAUTHORIZED,
      "Authentication failed",
      401,
    );
  }
};

export const optionalAuthMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);

      if (decoded) {
        request.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role as AuthUser["role"],
        };

        if (decoded.role === "VENDOR") {
          const vendor = await prisma.vendor.findUnique({
            where: { userId: decoded.userId },
            select: { id: true },
          });
          if (vendor && request.user) {
            request.user.vendorId = vendor.id;
          }
        }
      }
    }
  } catch {
    // Silently fail for optional auth
  }
};

export const requireRole = (...roles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return sendError(
        reply,
        ERROR_CODES.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    }

    const userRole = request.user.role.toUpperCase();
    const hasRole = roles.some((role) => role.toUpperCase() === userRole);

    if (!hasRole) {
      return sendError(
        reply,
        ERROR_CODES.FORBIDDEN,
        "Insufficient permissions",
        403,
      );
    }
  };
};

export const requireVerified = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (!request.user) {
    return sendError(
      reply,
      ERROR_CODES.UNAUTHORIZED,
      "Authentication required",
      401,
    );
  }

  // This would need to check the user's isVerified status from database
  // For now, we'll just check if the user exists
};
