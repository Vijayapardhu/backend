# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (argon2)
RUN apk add --no-cache python3 make g++

# Copy package files first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for building)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source files
COPY tsconfig.json ./
COPY src ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for native modules (argon2)
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
