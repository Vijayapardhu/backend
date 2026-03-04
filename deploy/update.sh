#!/bin/bash
set -euo pipefail

# ============================================
# HostHaven Backend - Quick Deploy / Update
# ============================================
# Run this after git pull to update the running app
# Usage: ./deploy/update.sh [docker|pm2]

DEPLOY_METHOD="${1:-docker}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$APP_DIR"

echo "Deploying HostHaven Backend ($DEPLOY_METHOD)..."
echo ""

if [ "$DEPLOY_METHOD" = "docker" ]; then
  echo "Pulling latest changes..."
  git pull origin main

  echo "Building and restarting containers..."
  cd docker
  docker compose build --no-cache app
  docker compose up -d

  echo "Running database migrations..."
  docker compose exec -T app npx prisma migrate deploy

  echo ""
  echo "Checking health..."
  sleep 5
  if curl -sf http://localhost:4000/health > /dev/null; then
    echo "✅ Deployment successful! App is healthy."
  else
    echo "⚠️  App may still be starting. Check: docker compose logs -f app"
  fi

elif [ "$DEPLOY_METHOD" = "pm2" ]; then
  echo "Pulling latest changes..."
  git pull origin main

  echo "Installing dependencies..."
  npm ci --omit=dev

  echo "Generating Prisma client..."
  npx prisma generate

  echo "Running database migrations..."
  npx prisma migrate deploy

  echo "Building TypeScript..."
  npm run build

  echo "Reloading PM2..."
  pm2 reload ecosystem.config.js --env production

  echo ""
  echo "Checking health..."
  sleep 5
  if curl -sf http://localhost:4000/health > /dev/null; then
    echo "✅ Deployment successful! App is healthy."
  else
    echo "⚠️  App may still be starting. Check: pm2 logs hosthaven-backend"
  fi

else
  echo "Usage: ./deploy/update.sh [docker|pm2]"
  exit 1
fi
