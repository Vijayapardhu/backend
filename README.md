# HostHaven Backend

A secure and scalable backend API for the HostHaven travel and heritage tourism platform.

## Features

- **Authentication**: Email/Password + Google OAuth
- **Security**: JWT tokens, Argon2id password hashing, Rate limiting, CORS, Helmet
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for sessions, rate limiting, and caching
- **API Documentation**: Swagger/OpenAPI

## Quick Start

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

### Docker Setup

```bash
# Development
cd docker
docker-compose -f docker-compose.dev.yml up -d

# Production
cd docker
docker-compose up -d
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
| POST | `/v1/auth/link-google` | Link Google account |
| DELETE | `/v1/auth/unlink-google` | Unlink Google account |

## Environment Variables

See `.env.example` for all required environment variables.

## Project Structure

```
src/
├── config/          # Configuration files
├── constants/       # Error codes, roles, statuses
├── middleware/      # Auth, error, validation middleware
├── modules/         # Feature modules
│   └── auth/        # Authentication module
├── services/        # Shared services (email, cache)
├── utils/           # Utility functions
├── app.ts           # Fastify app setup
└── server.ts        # Server entry point
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate  # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run test         # Run tests
npm run lint         # Run ESLint
```

## Security

- **Password Hashing**: Argon2id (winner of Password Hashing Competition)
- **JWT**: HS512 algorithm, 15-minute access tokens, 7-day refresh tokens
- **Rate Limiting**: 100 requests per minute (configurable)
- **CORS**: Configured for frontend domain
- **Helmet**: Security headers enabled

## License

MIT
