#!/usr/bin/env bash
set -euo pipefail

DOMAIN=${DOMAIN:-api.hosthaven.in}
CERTBOT_EMAIL=${CERTBOT_EMAIL:-}
WEBROOT=${WEBROOT:-/var/www/certbot}
CERT_PATH=/etc/letsencrypt/live/"$DOMAIN"

if [ -z "$CERTBOT_EMAIL" ]; then
  echo "CERTBOT_EMAIL is required for certificate issuance" >&2
  exit 1
fi

mkdir -p "$WEBROOT"
mkdir -p "$(dirname "$CERT_PATH")"
mkdir -p "$CERT_PATH"

cert_files_exist() {
  [ -f "$CERT_PATH/fullchain.pem" ] && [ -f "$CERT_PATH/privkey.pem" ]
}

generate_placeholder_cert() {
  echo "Generating temporary self-signed certificate for $DOMAIN"
  openssl req -x509 -nodes -newkey rsa:2048 \
    -days 1 \
    -subj "/CN=$DOMAIN" \
    -keyout "$CERT_PATH/privkey.pem" \
    -out "$CERT_PATH/fullchain.pem"
}

request_certificate() {
  echo "Requesting Let''s Encrypt certificate for $DOMAIN"
  certbot certonly \
    --noninteractive \
    --agree-tos \
    --no-eff-email \
    --email "$CERTBOT_EMAIL" \
    --webroot \
    --webroot-path "$WEBROOT" \
    --domain "$DOMAIN"
}

if ! cert_files_exist; then
  generate_placeholder_cert
  nginx
  sleep 3
  request_certificate
  nginx -s reload
  nginx -s quit
fi

exec nginx -g "daemon off;"
