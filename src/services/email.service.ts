import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger.util';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

interface EmailTemplate {
  html: string;
  text: string;
}

const templates: Record<string, (data: any) => EmailTemplate> = {
  'email-verification': (data) => ({
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4a574;">Welcome to HostHaven!</h2>
        <p>Hello ${data.name},</p>
        <p>Thank you for registering with HostHaven. Please verify your email address to get started.</p>
        <a href="${data.verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #d4a574; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
          Verify Email Address
        </a>
        <p style="color: #666;">This link will expire in ${data.expiresIn}.</p>
        <p style="color: #999; font-size: 12px;">If you didn't create an account, you can ignore this email.</p>
      </div>
    `,
    text: `
      Welcome to HostHaven!
      
      Hello ${data.name},
      
      Thank you for registering with HostHaven. Please verify your email address by visiting:
      ${data.verificationUrl}
      
      This link will expire in ${data.expiresIn}.
      
      If you didn't create an account, you can ignore this email.
    `,
  }),
  'password-reset': (data) => ({
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4a574;">Password Reset</h2>
        <p>Hello ${data.name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password.</p>
        <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 24px; background: #d4a574; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
          Reset Password
        </a>
        <p style="color: #666;">This link will expire in ${data.expiresIn}.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request a password reset, you can ignore this email.</p>
      </div>
    `,
    text: `
      Password Reset
      
      Hello ${data.name},
      
      We received a request to reset your password. Please visit:
      ${data.resetUrl}
      
      This link will expire in ${data.expiresIn}.
      
      If you didn't request a password reset, you can ignore this email.
    `,
  }),
  'welcome': (data) => ({
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4a574;">Welcome to HostHaven!</h2>
        <p>Hello ${data.name},</p>
        <p>Your account has been created successfully. You can now explore Andhra Pradesh's heritage destinations!</p>
        <a href="${data.loginUrl}" style="display: inline-block; padding: 12px 24px; background: #d4a574; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
          Start Exploring
        </a>
      </div>
    `,
    text: `
      Welcome to HostHaven!
      
      Hello ${data.name},
      
      Your account has been created successfully. Start exploring Andhra Pradesh's heritage destinations!
      
      Visit: ${data.loginUrl}
    `,
  }),
  'booking-confirmed': (data) => ({
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4a574;">Booking Confirmed!</h2>
        <p>Hello ${data.name},</p>
        <p>Your booking has been confirmed.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${data.propertyName}</h3>
          <p style="margin: 0;">Check-in: ${data.checkIn}</p>
          <p style="margin: 0;">Check-out: ${data.checkOut}</p>
          <p style="margin: 0;">Booking ID: ${data.bookingId}</p>
        </div>
        <p>Total Amount: ₹${data.totalAmount}</p>
      </div>
    `,
    text: `
      Booking Confirmed!
      
      Hello ${data.name},
      
      Your booking has been confirmed.
      
      Property: ${data.propertyName}
      Check-in: ${data.checkIn}
      Check-out: ${data.checkOut}
      Booking ID: ${data.bookingId}
      Total Amount: ₹${data.totalAmount}
    `,
  }),
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const template = templates[options.template];
    if (!template) {
      logger.error({ template: options.template }, 'Email template not found');
      return false;
    }

    const { html, text } = template(options.data);

    await transporter.sendMail({
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html,
      text,
    });

    logger.info({ to: options.to, template: options.template }, 'Email sent successfully');
    return true;
  } catch (error) {
    logger.error({ error, to: options.to }, 'Failed to send email');
    return false;
  }
};

export default { sendEmail };
