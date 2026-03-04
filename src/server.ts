import buildApp from './app';
import { config } from './config';
import prisma from './config/database';
import { logger } from './utils/logger.util';
import './jobs/email.job';

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connection established');

    const app = await buildApp();

    // Start server
    await app.listen({
      port: config.app.port,
      host: '0.0.0.0',
    });

    logger.info(
      {
        port: config.app.port,
        nodeEnv: config.app.nodeEnv,
        apiVersion: config.app.apiVersion,
      },
      `🚀 Server running at http://localhost:${config.app.port}`
    );

    logger.info(
      `📚 API Docs available at http://localhost:${config.app.port}/docs`
    );

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'] as const;
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        try {
          await app.close();
          logger.info('Server closed');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during graceful shutdown');
          process.exit(1);
        }
      });
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.fatal({ error }, 'Uncaught exception');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal({ reason, promise }, 'Unhandled rejection');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
};


start();
