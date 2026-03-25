#!/bin/bash
# EC2 Bootstrap Script — run once on a fresh Amazon Linux 2023 instance.
# Usage:
#   chmod +x setup-ec2.sh
#   sudo ./setup-ec2.sh prod   # for the production instance
#   sudo ./setup-ec2.sh dev    # for the dev instance
#
# Assumes: Amazon Linux 2023, run as root or with sudo.

set -euo pipefail

ENV=${1:-prod}
APP_DIR="/app/resale-dashboard${ENV == 'dev' ? '-dev' : ''}"
REPO_URL="git@github.com:YOUR_ORG/YOUR_REPO.git"   # ← update this
BRANCH="main"
if [ "$ENV" = "dev" ]; then BRANCH="dev"; fi

echo "==> Setting up $ENV environment in $APP_DIR (branch: $BRANCH)"

# ── System packages ─────────────────────────────────────────────────────────
dnf update -y
dnf install -y git nginx

# ── Node.js 20 via nvm ──────────────────────────────────────────────────────
export NVM_DIR="/root/.nvm"
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20

# Make node/npm/pm2 available system-wide
NODE_PATH=$(nvm which current)
ln -sf "$NODE_PATH" /usr/local/bin/node
ln -sf "$(dirname $NODE_PATH)/npm" /usr/local/bin/npm
ln -sf "$(dirname $NODE_PATH)/npx" /usr/local/bin/npx

# ── PM2 ─────────────────────────────────────────────────────────────────────
npm install -g pm2
ln -sf "$(which pm2)" /usr/local/bin/pm2
pm2 startup systemd -u root --hp /root | tail -1 | bash

# ── Clone repo ───────────────────────────────────────────────────────────────
mkdir -p /app
cd /app

# NOTE: Before running this script, add the EC2 instance's SSH public key
# as a Deploy Key in your GitHub repo (Settings → Deploy keys).
# Generate one with: ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
# Then add ~/.ssh/github_deploy.pub to GitHub.

if [ ! -d "$APP_DIR" ]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR" && git fetch origin && git reset --hard "origin/$BRANCH"
fi

# ── Backend setup ────────────────────────────────────────────────────────────
cd "$APP_DIR/backend"
npm ci

echo ""
echo "==> Create the .env file now. Example:"
echo ""
echo "  DATABASE_URL=file:../data/resale.db"
echo "  JWT_SECRET=<generate with: openssl rand -hex 32>"
echo "  JWT_EXPIRES_IN=8h"
echo "  PORT=4000"
echo "  UPLOAD_DIR=./uploads/photos"
echo "  MAX_PHOTO_SIZE_MB=10"
echo "  CORS_ORIGIN=https://<your-cloudfront-id>.cloudfront.net"
echo "  SHOPIFY_ENABLED=false"
echo "  SHOPIFY_STORE_DOMAIN=your-store.myshopify.com"
echo "  SHOPIFY_ACCESS_TOKEN=shpat_xxx"
echo ""
read -p "Press enter once you have created $APP_DIR/backend/.env ..."

# ── Database ─────────────────────────────────────────────────────────────────
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/backend/uploads/photos"
npx prisma migrate deploy

# ── Build & start ─────────────────────────────────────────────────────────────
npm run build
pm2 start ecosystem.config.cjs --only "resale-backend-$ENV"
pm2 save

# ── Nginx ────────────────────────────────────────────────────────────────────
cp "$APP_DIR/infra/nginx.conf" /etc/nginx/conf.d/resale.conf
nginx -t && systemctl enable nginx && systemctl restart nginx

echo ""
echo "==> Done! Backend running via PM2, nginx proxying on port 80."
echo "    EC2 public IP will serve the API at http://<EC2-IP>"
echo ""
echo "    Next steps:"
echo "    1. Copy the EC2 public DNS into GitHub secret PROD_API_URL (or DEV_API_URL)"
echo "    2. Create the S3 bucket and CloudFront distribution for the frontend"
echo "    3. Add all GitHub secrets (see DEPLOYMENT.md)"
echo "    4. Push to '$BRANCH' to trigger your first deploy"
