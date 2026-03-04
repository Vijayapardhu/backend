#!/bin/bash
set -euo pipefail

# ============================================
# HostHaven Backend - Ubuntu VPS Deploy Script
# ============================================
# Usage: curl -sSL <raw-github-url>/deploy/setup.sh | bash
# Or:    chmod +x deploy/setup.sh && ./deploy/setup.sh

APP_NAME="hosthaven-backend"
APP_DIR="/opt/hosthaven/backend"
APP_USER="hosthaven"

echo "================================================"
echo "  HostHaven Backend - Ubuntu VPS Setup"
echo "================================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo bash setup.sh"
  exit 1
fi

echo ""
echo "[1/8] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

echo ""
echo "[2/8] Installing dependencies..."
apt-get install -y -qq \
  curl \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  ufw \
  fail2ban \
  htop \
  unzip

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo ""
  echo "[3/8] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo ""
  echo "[3/8] Docker already installed, skipping..."
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
fi

# Install Node.js 20 (for non-Docker deployment option)
if ! command -v node &> /dev/null; then
  echo ""
  echo "[4/8] Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
  npm install -g pm2
else
  echo ""
  echo "[4/8] Node.js already installed ($(node -v)), skipping..."
  if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
  fi
fi

echo ""
echo "[5/8] Creating application user and directory..."
if ! id "$APP_USER" &>/dev/null; then
  useradd -r -m -s /bin/bash "$APP_USER"
  usermod -aG docker "$APP_USER"
fi
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo ""
echo "[6/8] Configuring firewall (UFW)..."
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "[7/8] Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban

echo ""
echo "[8/8] Setting up swap (if < 2GB RAM)..."
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM" -lt 2048 ] && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Swap file created (2GB)"
fi

echo ""
echo "================================================"
echo "  Initial setup complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. Clone your repository:"
echo "     su - $APP_USER"
echo "     cd $APP_DIR"
echo "     git clone https://github.com/Vijayapardhu/backend.git ."
echo ""
echo "  2. Configure environment:"
echo "     cp .env.example .env"
echo "     nano .env   # Edit with your production values"
echo ""
echo "  3. Deploy with Docker (recommended):"
echo "     cd docker"
echo "     docker compose up -d"
echo "     docker compose exec app npx prisma migrate deploy"
echo ""
echo "  OR deploy with PM2 (alternative):"
echo "     npm ci --omit=dev"
echo "     npx prisma generate"
echo "     npx prisma migrate deploy"
echo "     pm2 start ecosystem.config.js --env production"
echo "     pm2 save"
echo "     pm2 startup"
echo ""
echo "  4. Setup nginx:"
echo "     cp nginx/hosthaven.conf /etc/nginx/sites-available/hosthaven"
echo "     # Edit the config: replace 'your-domain.com' with your actual domain"
echo "     nano /etc/nginx/sites-available/hosthaven"
echo "     ln -sf /etc/nginx/sites-available/hosthaven /etc/nginx/sites-enabled/"
echo "     rm -f /etc/nginx/sites-enabled/default"
echo "     nginx -t && systemctl reload nginx"
echo ""
echo "  5. Setup SSL (after DNS is pointing to this server):"
echo "     certbot --nginx -d your-domain.com -d www.your-domain.com"
echo ""
echo "  6. (Optional) Seed the database:"
echo "     docker compose exec app npx tsx prisma/seeds/index.ts"
echo ""
echo "================================================"
