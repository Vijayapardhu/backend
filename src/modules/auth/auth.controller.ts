import { FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import authService from './auth.service';
import { sendError, sendSuccess } from '../../utils/response.util';
import { ERROR_CODES } from '../../constants/error-codes';
import {
  registerSchema,
  loginSchema,
  googleIdTokenSchema,
  googleCallbackSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
} from './auth.schema';
import { generateStateToken } from '../../utils/crypto.util';
import { cacheService } from '../../services/cache.service';
import { config } from '../../config';
import { logger } from '../../utils/logger.util';

export const AuthController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);
      const result = await authService.registerWithEmail(data);
      return sendSuccess(reply, result, 201);
    } catch (error: any) {
      logger.error({ error }, 'Registration failed');
      if (error.code === ERROR_CODES.EMAIL_EXISTS) {
        return sendError(reply, error.code, error.message, 409);
      }
      if (error instanceof Error) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, error.message, 400);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Registration failed', 500);
    }
  },

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body);
      const result = await authService.loginWithEmail({
        email: data.email,
        password: data.password,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      });
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Login failed');

      if (error instanceof Prisma.PrismaClientInitializationError) {
        return sendError(
          reply,
          ERROR_CODES.DATABASE_ERROR,
          'Database unavailable. Please check database connectivity and try again.',
          503
        );
      }

      const statusCode =
        error.code === ERROR_CODES.ACCOUNT_LOCKED ? 423 :
          error.code === ERROR_CODES.ACCOUNT_DISABLED ? 403 :
            error.code === ERROR_CODES.OAUTH_ONLY_ACCOUNT ? 400 : 401;

      return sendError(reply, error.code || ERROR_CODES.INVALID_CREDENTIALS, error.message, statusCode);
    }
  },

  async vendorLogin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body);
      const result = await authService.loginVendorWithEmail({
        email: data.email,
        password: data.password,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      });
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Vendor login failed');

      if (error instanceof Prisma.PrismaClientInitializationError) {
        return sendError(
          reply,
          ERROR_CODES.DATABASE_ERROR,
          'Database unavailable. Please check database connectivity and try again.',
          503
        );
      }

      const statusCode =
        error.code === ERROR_CODES.ACCOUNT_LOCKED ? 423 :
          error.code === ERROR_CODES.ACCOUNT_DISABLED ? 403 :
            error.code === ERROR_CODES.OAUTH_ONLY_ACCOUNT ? 400 : 401;

      return sendError(reply, error.code || ERROR_CODES.INVALID_CREDENTIALS, error.message, statusCode);
    }
  },

  async googleAuthUrl(request: FastifyRequest, reply: FastifyReply) {
    try {
      const state = generateStateToken();
      const authUrl = await authService.getGoogleAuthUrl(state);
      return sendSuccess(reply, { url: authUrl, state });
    } catch (error: any) {
      logger.error({ error }, 'Google auth URL generation failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to generate Google auth URL', 500);
    }
  },

  async googleCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { code, state } = googleCallbackSchema.parse(request.query);

      // Verify state (skip if Redis is disabled)
      if (config.redis.enabled) {
        const stateData = await cacheService.get(cacheService.keys.stateToken(state));
        if (!stateData) {
          return sendError(reply, ERROR_CODES.INVALID_TOKEN, ' Invalid or expired state token', 400);
        }
        await cacheService.del(cacheService.keys.stateToken(state));
      }

      const result = await authService.handleGoogleCallback(
        code,
        request.ip,
        request.headers['user-agent'] || ''
      );

      // Redirect to frontend with tokens
      const frontendUrl = new URL(`${config.app.frontendUrl}/auth/callback`);
      frontendUrl.searchParams.set('accessToken', result.tokens.accessToken);
      frontendUrl.searchParams.set('refreshToken', result.tokens.refreshToken);
      frontendUrl.searchParams.set('isNewUser', String(result.isNewUser));

      return reply.redirect(frontendUrl.toString());
    } catch (error: any) {
      logger.error({ error }, 'Google callback failed');
      const errorUrl = new URL(`${config.app.frontendUrl}/login`);
      errorUrl.searchParams.set('error', error.message || 'Google login failed');
      return reply.redirect(errorUrl.toString());
    }
  },

  async googleLogin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { idToken } = googleIdTokenSchema.parse(request.body);

      const result = await authService.loginWithGoogleIdToken(
        idToken,
        request.ip,
        request.headers['user-agent'] || ''
      );

      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Google login failed');
      const statusCode =
        error.code === ERROR_CODES.ACCOUNT_DISABLED ? 403 : 401;
      return sendError(reply, error.code || ERROR_CODES.GOOGLE_AUTH_FAILED, error.message, statusCode);
    }
  },

  async linkGoogle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { idToken } = googleIdTokenSchema.parse(request.body);
      const userId = (request as any).user.id;

      const result = await authService.linkGoogleAccount(userId, idToken);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Link Google failed');
      const statusCode =
        error.code === ERROR_CODES.GOOGLE_ACCOUNT_LINKED ? 409 : 400;
      return sendError(reply, error.code || ERROR_CODES.INTERNAL_ERROR, error.message, statusCode);
    }
  },

  async unlinkGoogle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const result = await authService.unlinkGoogleAccount(userId);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Unlink Google failed');
      const statusCode =
        error.code === ERROR_CODES.CANNOT_UNLINK_ONLY_AUTH ? 400 : 500;
      return sendError(reply, error.code || ERROR_CODES.INTERNAL_ERROR, error.message, statusCode);
    }
  },

  async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = verifyEmailSchema.parse(request.body);
      const result = await authService.verifyEmail(token);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Email verification failed');
      const statusCode = error.code === ERROR_CODES.INVALID_TOKEN ? 400 : 500;
      return sendError(reply, error.code || ERROR_CODES.INTERNAL_ERROR, error.message, statusCode);
    }
  },

  async resendVerification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = resendVerificationSchema.parse(request.body);
      const result = await authService.resendVerificationEmail(email);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Resend verification failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to resend verification email', 500);
    }
  },

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = forgotPasswordSchema.parse(request.body);
      const result = await authService.forgotPassword(email);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Forgot password failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to process request', 500);
    }
  },

  async vendorForgotPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = forgotPasswordSchema.parse(request.body);
      const result = await authService.forgotVendorPassword(email);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Vendor forgot password failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to process request', 500);
    }
  },

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = resetPasswordSchema.parse(request.body);
      const result = await authService.resetPassword(data.token, data.password);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Reset password failed');
      const statusCode = error.code === ERROR_CODES.INVALID_TOKEN ? 400 : 500;
      return sendError(reply, error.code || ERROR_CODES.INTERNAL_ERROR, error.message, statusCode);
    }
  },

  async vendorResetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = resetPasswordSchema.parse(request.body);
      const result = await authService.resetVendorPassword(data.token, data.password);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Vendor reset password failed');
      const statusCode = error.code === ERROR_CODES.INVALID_TOKEN ? 400 : 500;
      return sendError(reply, error.code || ERROR_CODES.INTERNAL_ERROR, error.message, statusCode);
    }
  },

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(request.body);
      const tokens = await authService.refreshTokens(refreshToken);
      return sendSuccess(reply, tokens);
    } catch (error: any) {
      logger.error({ error }, 'Token refresh failed');
      return sendError(reply, error.code || ERROR_CODES.INVALID_TOKEN, error.message, 401);
    }
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { refreshToken } = request.body as { refreshToken?: string };
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      return sendSuccess(reply, { message: 'Logged out successfully' });
    } catch (error: any) {
      logger.error({ error }, 'Logout failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Logout failed', 500);
    }
  },

  async logoutAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const result = await authService.logoutAll(userId);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Logout all failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Logout failed', 500);
    }
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const user = await authService.getCurrentUser(userId);
      return sendSuccess(reply, { user });
    } catch (error: any) {
      logger.error({ error }, 'Get current user failed');
      return sendError(reply, error.code || ERROR_CODES.USER_NOT_FOUND, error.message, 404);
    }
  },

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };

      if (!currentPassword || !newPassword) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Current and new password are required', 400);
      }

      if (newPassword.length < 6) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'New password must be at least 6 characters', 400);
      }

      const result = await authService.changePassword(userId, currentPassword, newPassword);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Change password failed');
      if (error.code === ERROR_CODES.UNAUTHORIZED) {
        return sendError(reply, error.code, error.message, 401);
      }
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to change password', 500);
    }
  },

  // ==========================================
  // PROFILE
  // ==========================================

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const data = request.body as { name?: string; avatar?: string; phone?: string };
      const result = await authService.updateProfile(userId, data);
      return sendSuccess(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Update profile failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to update profile', 500);
    }
  },

  // ==========================================
  // ADDRESSES
  // ==========================================

  async getAddresses(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const addresses = await authService.getAddresses(userId);
      return sendSuccess(reply, { addresses });
    } catch (error: any) {
      logger.error({ error }, 'Get addresses failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to get addresses', 500);
    }
  },

  async addAddress(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const data = request.body as { label: string; address: string; city: string; state: string; pincode: string };
      const address = await authService.addAddress(userId, data);
      return sendSuccess(reply, { address }, 201);
    } catch (error: any) {
      logger.error({ error }, 'Add address failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to add address', 500);
    }
  },

  async updateAddress(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params as { id: string };
      const data = request.body as { label?: string; address?: string; city?: string; state?: string; pincode?: string };
      const address = await authService.updateAddress(userId, id, data);
      return sendSuccess(reply, { address });
    } catch (error: any) {
      logger.error({ error }, 'Update address failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to update address', 500);
    }
  },

  async deleteAddress(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params as { id: string };
      await authService.deleteAddress(userId, id);
      return sendSuccess(reply, { message: 'Address deleted successfully' });
    } catch (error: any) {
      logger.error({ error }, 'Delete address failed');
      if (error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
        return sendError(reply, error.code, error.message, 404);
      }
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Failed to delete address', 500);
    }
  },
};
