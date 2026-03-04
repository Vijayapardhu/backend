import { OAuth2Client } from 'google-auth-library';
import prisma from '../../config/database';
import { config } from '../../config';
import { hashPassword, verifyPassword } from '../../utils/hash.util';
import { generateTokens, verifyRefreshToken } from '../../utils/token.util';
import { generateSecureToken } from '../../utils/crypto.util';
import { sendEmail } from '../../services/email.service';
import { cacheService } from '../../services/cache.service';
import { logger } from '../../utils/logger.util';
import { ERROR_CODES } from '../../constants/error-codes';

const googleClient = new OAuth2Client({
  clientId: config.google.clientId,
  clientSecret: config.google.clientSecret,
  redirectUri: config.google.redirectUri,
});

export class AuthService {
  // ==========================================
  // EMAIL/PASSWORD REGISTRATION
  // ==========================================

  async registerWithEmail(data: {
    name: string;
    email: string;
    password: string;
  }) {
    const normalizedEmail = data.email.toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail, isDeleted: false },
    });

    if (existingUser) {
      const error = new Error('Email already registered');
      (error as any).code = ERROR_CODES.EMAIL_EXISTS;
      throw error;
    }

    const passwordHash = await hashPassword(data.password);

    const verificationToken = generateSecureToken(32);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        passwordHash,
        isVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    await this.sendVerificationEmail(user.email, verificationToken, user.name);

    logger.info({ userId: user.id, email: user.email }, 'User registered');

    return {
      user: this.sanitizeUser(user),
      message: 'Verification email sent. Please check your inbox.',
    };
  }

  // ==========================================
  // EMAIL/PASSWORD LOGIN
  // ==========================================

  async loginWithEmail(data: {
    email: string;
    password: string;
    ipAddress: string;
    userAgent: string;
  }) {
    const normalizedEmail = data.email.toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail, isDeleted: false },
    });

    if (!user) {
      const error = new Error('Invalid email or password');
      (error as any).code = ERROR_CODES.INVALID_CREDENTIALS;
      throw error;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const error = new Error('Account is temporarily locked. Please try again later.');
      (error as any).code = ERROR_CODES.ACCOUNT_LOCKED;
      throw error;
    }

    if (!user.passwordHash) {
      const error = new Error('This account uses Google sign-in. Please continue with Google.');
      (error as any).code = ERROR_CODES.OAUTH_ONLY_ACCOUNT;
      throw error;
    }

    const isValid = await verifyPassword(user.passwordHash, data.password);

    if (!isValid) {
      await this.handleFailedLogin(user);
      const error = new Error('Invalid email or password');
      (error as any).code = ERROR_CODES.INVALID_CREDENTIALS;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account has been disabled. Please contact support.');
      (error as any).code = ERROR_CODES.ACCOUNT_DISABLED;
      throw error;
    }

    const tokens = await this.createUserSession(user, data.ipAddress, data.userAgent);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: data.ipAddress,
      },
    });

    logger.info({ userId: user.id, email: user.email }, 'User logged in');

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ==========================================
  // VENDOR AUTHENTICATION
  // ==========================================

  async loginVendorWithEmail(data: {
    email: string;
    password: string;
    ipAddress: string;
    userAgent: string;
  }) {
    const normalizedEmail = data.email.toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail, isDeleted: false },
    });

    if (!user || user.role !== 'VENDOR') {
      const error = new Error('Invalid email or password');
      (error as any).code = ERROR_CODES.INVALID_CREDENTIALS;
      throw error;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const error = new Error('Account is temporarily locked. Please try again later.');
      (error as any).code = ERROR_CODES.ACCOUNT_LOCKED;
      throw error;
    }

    if (!user.passwordHash) {
      const error = new Error('This account uses Google sign-in. Please continue with Google.');
      (error as any).code = ERROR_CODES.OAUTH_ONLY_ACCOUNT;
      throw error;
    }

    const isValid = await verifyPassword(user.passwordHash, data.password);

    if (!isValid) {
      await this.handleFailedLogin(user);
      const error = new Error('Invalid email or password');
      (error as any).code = ERROR_CODES.INVALID_CREDENTIALS;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account has been disabled. Please contact support.');
      (error as any).code = ERROR_CODES.ACCOUNT_DISABLED;
      throw error;
    }

    const tokens = await this.createUserSession(user, data.ipAddress, data.userAgent);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: data.ipAddress,
      },
    });

    logger.info({ userId: user.id, email: user.email }, 'Vendor logged in');

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async forgotVendorPassword(email: string) {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), isDeleted: false, role: 'VENDOR' },
    });

    if (!user) {
      return { message: 'If the email exists, a password reset link will be sent' };
    }

    const resetToken = generateSecureToken(32);
    const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    const vendorAppUrl = process.env.VENDOR_URL || 'http://localhost:5174';
    const resetUrl = `${vendorAppUrl}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Reset Your Vendor Password - HostHaven',
      template: 'password-reset',
      data: {
        name: user.name,
        resetUrl,
        expiresIn: '1 hour',
      },
    });

    return { message: 'Password reset email sent' };
  }

  async resetVendorPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token, role: 'VENDOR' },
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      const error = new Error('Invalid or expired reset token');
      (error as any).code = ERROR_CODES.INVALID_TOKEN;
      throw error;
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        lockedUntil: null,
        failedLoginAttempts: 0,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await prisma.session.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });

    logger.info({ userId: user.id }, 'Vendor password reset');

    return { message: 'Password reset successfully' };
  }

  // ==========================================
  // GOOGLE OAUTH
  // ==========================================

  async getGoogleAuthUrl(state: string) {
    // Store state token only if Redis is enabled
    if (config.redis.enabled) {
      await cacheService.set(
        cacheService.keys.stateToken(state),
        { createdAt: new Date().toISOString() },
        cacheService.getTTL().STATE_TOKEN
      );
    }

    const authUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state,
      prompt: 'select_account',
    });

    return authUrl;
  }

  async handleGoogleCallback(code: string, ipAddress: string, userAgent: string) {
    const { tokens } = await googleClient.getToken(code);

    if (!tokens.id_token) {
      const error = new Error('Google authentication failed');
      (error as any).code = ERROR_CODES.GOOGLE_AUTH_FAILED;
      throw error;
    }

    return this.loginWithGoogleIdToken(tokens.id_token, ipAddress, userAgent);
  }

  async loginWithGoogleIdToken(idToken: string, ipAddress: string, userAgent: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      const error = new Error('Invalid Google token');
      (error as any).code = ERROR_CODES.INVALID_GOOGLE_TOKEN;
      throw error;
    }

    return this.findOrCreateGoogleUser({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || 'User',
      avatar: payload.picture,
      ipAddress,
      userAgent,
    });
  }

  private async findOrCreateGoogleUser(data: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
    ipAddress: string;
    userAgent: string;
  }) {
    let isNewUser = false;

    let user = await prisma.user.findUnique({
      where: { googleId: data.googleId },
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: data.googleId,
            avatarUrl: user.avatarUrl || data.avatar,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
            isVerified: true,
          },
        });

        logger.info({ userId: user.id }, 'Google account linked to existing user');
      } else {
        isNewUser = true;
        user = await prisma.user.create({
          data: {
            email: data.email.toLowerCase(),
            name: data.name,
            googleId: data.googleId,
            avatarUrl: data.avatar,
            isVerified: true,
            emailVerifiedAt: new Date(),
          },
        });

        await this.sendWelcomeEmail(user.email, user.name);

        logger.info({ userId: user.id, email: user.email }, 'New user created via Google');
      }
    }

    if (!user.isActive) {
      const error = new Error('Account has been disabled');
      (error as any).code = ERROR_CODES.ACCOUNT_DISABLED;
      throw error;
    }

    const tokens = await this.createUserSession(user, data.ipAddress, data.userAgent);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: data.ipAddress,
      },
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
      isNewUser,
    };
  }

  // ==========================================
  // LINK/UNLINK GOOGLE
  // ==========================================

  async linkGoogleAccount(userId: string, idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      const error = new Error('Invalid Google token');
      (error as any).code = ERROR_CODES.INVALID_GOOGLE_TOKEN;
      throw error;
    }

    const existingUser = await prisma.user.findUnique({
      where: { googleId: payload.sub },
    });

    if (existingUser && existingUser.id !== userId) {
      const error = new Error('This Google account is linked to another user');
      (error as any).code = ERROR_CODES.GOOGLE_ACCOUNT_LINKED;
      throw error;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { googleId: payload.sub },
    });

    logger.info({ userId, googleId: payload.sub }, 'Google account linked');

    return { message: 'Google account linked successfully' };
  }

  async unlinkGoogleAccount(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const error = new Error('User not found');
      (error as any).code = ERROR_CODES.USER_NOT_FOUND;
      throw error;
    }

    if (!user.passwordHash) {
      const error = new Error('Cannot unlink Google. Please set a password first.');
      (error as any).code = ERROR_CODES.CANNOT_UNLINK_ONLY_AUTH;
      throw error;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { googleId: null },
    });

    logger.info({ userId }, 'Google account unlinked');

    return { message: 'Google account unlinked' };
  }

  // ==========================================
  // EMAIL VERIFICATION
  // ==========================================

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { isVerified: false, emailVerificationToken: token },
    });

    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      const error = new Error('Invalid or expired verification token');
      (error as any).code = ERROR_CODES.INVALID_TOKEN;
      throw error;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    logger.info({ userId: user.id }, 'Email verified');

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), isDeleted: false },
    });

    if (!user) {
      return { message: 'If the email exists, a verification email will be sent' };
    }

    if (user.isVerified) {
      return { message: 'Email is already verified' };
    }

    const verificationToken = generateSecureToken(32);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    await this.sendVerificationEmail(user.email, verificationToken, user.name);

    return { message: 'Verification email sent' };
  }

  // ==========================================
  // PASSWORD RESET
  // ==========================================

  async forgotPassword(email: string) {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), isDeleted: false },
    });

    if (!user) {
      return { message: 'If the email exists, a password reset link will be sent' };
    }

    const resetToken = generateSecureToken(32);
    const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    await this.sendPasswordResetEmail(user.email, resetToken, user.name);

    return { message: 'Password reset email sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      const error = new Error('Invalid or expired reset token');
      (error as any).code = ERROR_CODES.INVALID_TOKEN;
      throw error;
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        lockedUntil: null,
        failedLoginAttempts: 0,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await prisma.session.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });

    logger.info({ userId: user.id }, 'Password reset');

    return { message: 'Password reset successfully' };
  }

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  private async createUserSession(
    user: { id: string; email: string; role: string },
    ipAddress: string,
    userAgent: string
  ) {
    const { accessToken, refreshToken, expiresIn } = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress,
        userAgent,
        deviceType: userAgent?.includes('Mobile') ? 'mobile' : 'desktop',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, expiresIn };
  }

  async refreshTokens(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      const error = new Error('Invalid refresh token');
      (error as any).code = ERROR_CODES.INVALID_TOKEN;
      throw error;
    }

    const session = await prisma.session.findFirst({
      where: {
        refreshToken,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      const error = new Error('Session not found or expired');
      (error as any).code = ERROR_CODES.INVALID_TOKEN;
      throw error;
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { isActive: false },
    });

    const tokens = await this.createUserSession(
      session.user,
      session.ipAddress || '',
      session.userAgent || ''
    );

    return tokens;
  }

  async logout(refreshToken: string) {
    await prisma.session.updateMany({
      where: { refreshToken },
      data: { isActive: false },
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    logger.info({ userId }, 'User logged out from all devices');

    return { message: 'Logged out from all devices' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      const error = new Error('User not found or no password set');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const isValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isValid) {
      const error = new Error('Current password is incorrect');
      (error as any).code = ERROR_CODES.UNAUTHORIZED;
      throw error;
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    logger.info({ userId }, 'Password changed successfully');

    return { message: 'Password changed successfully' };
  }

  // ==========================================
  // GET CURRENT USER
  // ==========================================

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        googleId: true,
        createdAt: true,
        phone: true,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      (error as any).code = ERROR_CODES.USER_NOT_FOUND;
      throw error;
    }

    return {
      ...user,
      avatar: user.avatarUrl,
      authMethods: [
        ...(user.googleId ? ['google'] : []),
        'email',
      ],
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async handleFailedLogin(user: { id: string; failedLoginAttempts: number }) {
    const attempts = user.failedLoginAttempts + 1;
    const updateData: any = { failedLoginAttempts: attempts };

    if (attempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });
  }

  private async sendVerificationEmail(email: string, token: string, name: string) {
    const verificationUrl = `${config.app.frontendUrl}/verify-email?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Verify Your Email - HostHaven',
      template: 'email-verification',
      data: {
        name,
        verificationUrl,
        expiresIn: '24 hours',
      },
    });
  }

  private async sendPasswordResetEmail(email: string, token: string, name: string) {
    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Reset Your Password - HostHaven',
      template: 'password-reset',
      data: {
        name,
        resetUrl,
        expiresIn: '1 hour',
      },
    });
  }

  private async sendWelcomeEmail(email: string, name: string) {
    await sendEmail({
      to: email,
      subject: 'Welcome to HostHaven!',
      template: 'welcome',
      data: {
        name,
        loginUrl: `${config.app.frontendUrl}/login`,
      },
    });
  }

  // ==========================================
  // PROFILE MANAGEMENT
  // ==========================================

  async updateProfile(userId: string, data: { name?: string; avatar?: string; phone?: string }) {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatar !== undefined) updateData.avatarUrl = data.avatar;
    if (data.phone !== undefined) updateData.phone = data.phone;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return { user: this.sanitizeUser(user) };
  }

  // ==========================================
  // ADDRESS MANAGEMENT
  // ==========================================

  async getAddresses(userId: string) {
    const addresses = await prisma.userAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return addresses;
  }

  async addAddress(userId: string, data: { label: string; address: string; city: string; state: string; pincode: string }) {
    const address = await prisma.userAddress.create({
      data: {
        userId,
        label: data.label,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      },
    });
    return address;
  }

  async updateAddress(userId: string, addressId: string, data: { label?: string; address?: string; city?: string; state?: string; pincode?: string }) {
    const existing = await prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      const error = new Error('Address not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    const address = await prisma.userAddress.update({
      where: { id: addressId },
      data: data,
    });
    return address;
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      const error = new Error('Address not found');
      (error as any).code = ERROR_CODES.RESOURCE_NOT_FOUND;
      throw error;
    }

    await prisma.userAddress.delete({
      where: { id: addressId },
    });
    return { message: 'Address deleted successfully' };
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatarUrl,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
export default authService;
