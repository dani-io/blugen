#!/bin/bash
set -e

DOMAIN="blugen.ir"
EMAIL="admin@blugen.ir"  # ← ایمیلت رو اینجا بذار

echo "🏋️ Blugen - Deploy Script"
echo "========================="

# Generate secret key
if [ ! -f .env ]; then
    echo "SECRET_KEY=$(openssl rand -hex 32)" > .env
    echo "✅ Secret key generated"
fi

# Create data directory
mkdir -p data certbot/www certbot/conf

# Step 1: Build everything
echo ""
echo "📦 Building containers..."
docker compose build

# Step 2: Start with HTTP-only config for certbot
echo ""
echo "🌐 Starting with HTTP config..."
cp nginx/nginx-init.conf nginx/nginx.conf.bak
cp nginx/nginx-init.conf nginx/nginx.conf
docker compose up -d

# Wait for nginx to start
sleep 5

# Step 3: Get SSL certificate
echo ""
echo "🔒 Getting SSL certificate for $DOMAIN..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Step 4: Switch to HTTPS config
echo ""
echo "🔄 Switching to HTTPS config..."
cp nginx/nginx.conf.bak nginx/nginx.conf
rm nginx/nginx.conf.bak

# Restart nginx with SSL config
docker compose restart nginx

echo ""
echo "✅ Blugen is live at https://$DOMAIN"
echo ""
echo "📱 Default admin: 09120000000 / 0000"
echo "🔑 Change the admin password after first login!"
