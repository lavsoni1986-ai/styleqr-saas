#!/bin/bash
# Production Deployment Script for StyleQR SaaS
# Run from server: /var/www/styleqr/deploy.sh

set -e

APP_DIR="/var/www/styleqr"
BRANCH="main"  # Change to your production branch

echo "🚀 Starting StyleQR SaaS Production Deployment..."
echo ""

cd "$APP_DIR"

# Pull latest code
echo "📥 Pulling latest code from $BRANCH..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Install/update dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

# Build Next.js application
echo "🏗️  Building Next.js application..."
npm run build

# Restart PM2 application
echo "🔄 Restarting application..."
pm2 restart styleqr-saas --update-env

# Show PM2 status
pm2 status

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check application status:"
echo "  pm2 status"
echo "  pm2 logs styleqr-saas"
echo ""
echo "View logs:"
echo "  pm2 logs styleqr-saas --lines 100"
