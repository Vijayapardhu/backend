# HostHaven Backend

A secure and scalable backend API for the HostHaven travel and heritage tourism platform.

## Features

- **Authentication**: Email/Password + Google OAuth
- **Security**: JWT tokens, Argon2id password hashing, Rate limiting, CORS, Helmet
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for sessions, rate limiting, and caching
- **API Documentation**: Swagger/OpenAPI
- **File Storage**: Cloudflare R2 (S3-compatible)
- **Payments**: Razorpay integration
- **Email**: SMTP via Resend
- **Background Jobs**: BullMQ with Redis

## Quick Start (Development)

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Docker (Development)

```bash
cd docker
docker compose -f docker-compose.dev.yml up -d
```

---

## Production Deployment (Ubuntu VPS)

### Option A: Automated Setup (Recommended)

```bash
# On your Ubuntu VPS (as root):
# 1. Run the setup script
curl -sSL https://raw.githubusercontent.com/Vijayapardhu/backend/main/deploy/setup.sh | sudo bash

# 2. Switch to app user and clone
su - hosthaven
cd /opt/hosthaven/backend
git clone https://github.com/Vijayapardhu/backend.git .

# 3. Configure environment
cp .env.example .env
nano .env  # Set all production values (see Environment section below)

# 4. Deploy with Docker
cd docker
docker compose up -d

# 5. Run database migrations
docker compose exec app npx prisma migrate deploy

# 6. (Optional) Seed the database
docker compose exec app npx tsx prisma/seeds/index.ts
```

### Option B: Manual Setup

```bash
# 1. Install prerequisites
sudo apt update && sudo apt install -y git curl nginx certbot python3-certbot-nginx

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# OR install Node.js 20 + PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 2. Clone and configure
git clone https://github.com/Vijayapardhu/backend.git /opt/hosthaven/backend
cd /opt/hosthaven/backend
cp .env.example .env
nano .env  # Configure production values

# 3a. Deploy with Docker
cd docker
docker compose up -d
docker compose exec app npx prisma migrate deploy

# 3b. OR Deploy with PM2
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

### Nginx & SSL Setup

```bash
# Copy nginx config
sudo cp nginx/hosthaven.conf /etc/nginx/sites-available/hosthaven

# Edit: replace 'your-domain.com' with your actual domain
sudo nano /etc/nginx/sites-available/hosthaven

# Enable site
sudo ln -sf /etc/nginx/sites-available/hosthaven /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Setup SSL (after DNS points to your server)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Updating (After Initial Deploy)

```bash
# With Docker
./deploy/update.sh docker

# With PM2
./deploy/update.sh pm2
```

---

## Environment Variables

See `.env.example` for all required variables. Key production settings:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to `production` |
| `PORT` | Server port (default: 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Strong random secret for access tokens |
| `JWT_REFRESH_SECRET` | Strong random secret for refresh tokens |
| `FRONTEND_URL` | Your frontend URL (for CORS) |
| `APP_URL` | Your backend URL |
| `SMTP_*` | Email configuration |
| `RAZORPAY_*` | Payment gateway keys |
| `R2_*` | Cloudflare R2 storage credentials |

Generate secure JWT secrets:
```bash
openssl rand -hex 64
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/register` | Register with email/password |
| POST | `/v1/auth/login` | Login with email/password |
| POST | `/v1/auth/google` | Login with Google ID token |
| GET | `/v1/auth/google` | Get Google OAuth URL |
| GET | `/v1/auth/google/callback` | Google OAuth callback |
| POST | `/v1/auth/refresh` | Refresh access token |
| POST | `/v1/auth/logout` | Logout current session |
| POST | `/v1/auth/logout-all` | Logout all sessions |
| GET | `/v1/auth/me` | Get current user |
| POST | `/v1/auth/verify-email` | Verify email address |
| POST | `/v1/auth/forgot-password` | Request password reset |
| POST | `/v1/auth/reset-password` | Reset password |

### Core Resources

| Prefix | Description |
|--------|-------------|
| `/v1/properties` | Hotel/Home/Temple property management |
| `/v1/rooms` | Room management |
| `/v1/temples` | Standalone temple listings |
| `/v1/bookings` | Booking management |
| `/v1/payments` | Payment processing (Razorpay) |
| `/v1/reviews` | Review & rating system |
| `/v1/wishlist` | User wishlists |
| `/v1/services` | Travel services |
| `/v1/uploads` | File uploads (R2) |
| `/v1/notifications` | User notifications |
| `/v1/vendor` | Vendor dashboard |
| `/v1/admin` | Admin panel |
| `/v1/support` | Support tickets |
| `/v1/inventory` | Room inventory management |
| `/health` | Health check endpoint |

## Project Structure

```
├── deploy/              # Deployment scripts
│   ├── setup.sh         # Initial VPS setup
│   └── update.sh        # Update/redeploy script
├── docker/
│   ├── Dockerfile       # Multi-stage production build
│   ├── docker-compose.yml       # Production compose
│   └── docker-compose.dev.yml   # Development compose
├── nginx/
│   └── hosthaven.conf   # Nginx reverse proxy config
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── migrations/      # Database migrations
│   └── seeds/           # Seed data
├── src/
│   ├── config/          # Configuration files
│   ├── constants/       # Error codes, roles, statuses
│   ├── jobs/            # Background jobs (BullMQ)
│   ├── middleware/       # Auth, error, validation
│   ├── modules/         # Feature modules
│   ├── services/        # Shared services (email, cache)
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── app.ts           # Fastify app setup
│   └── server.ts        # Server entry point
├── ecosystem.config.js  # PM2 configuration
└── package.json
```

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations (dev)
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database
npm run test             # Run tests
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking
```

## Security

- **Password Hashing**: Argon2id (winner of Password Hashing Competition)
- **JWT**: HS512 algorithm, 15-minute access tokens, 7-day refresh tokens
- **Rate Limiting**: 100 requests per minute (configurable)
- **CORS**: Configured for frontend domain only in production
- **Helmet**: Security headers enabled
- **Docker**: Non-root user, health checks, resource limits
- **Nginx**: SSL/TLS, security headers, gzip compression
- **Firewall**: UFW configured for SSH, HTTP, HTTPS only
- **Fail2ban**: Brute-force protection

## License

MIT
