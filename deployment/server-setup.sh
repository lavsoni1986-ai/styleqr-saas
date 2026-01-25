#!/bin/bash
# Production Server Setup Script for StyleQR SaaS
# Run as root on fresh Ubuntu 22.04 LTS VPS

set -e

echo "🚀 Starting StyleQR SaaS Production Server Setup..."
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
apt-get install -y curl wget git build-essential ufw certbot python3-certbot-nginx

# Install Node.js 20 LTS
echo "📦 Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt-get install -y nginx

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Configure PostgreSQL
sudo -u postgres psql <<EOF
ALTER USER postgres PASSWORD 'CHANGE_THIS_PASSWORD_IN_PRODUCTION';
CREATE DATABASE styleqr_prod;
EOF

# Setup firewall
echo "🔒 Configuring firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Setup automatic security updates
echo "🔒 Setting up automatic security updates..."
apt-get install -y unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /var/www/styleqr
chown -R $USER:$USER /var/www/styleqr

# Create PM2 ecosystem file
echo "📝 Creating PM2 ecosystem configuration..."
cat > /var/www/styleqr/ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'styleqr-saas',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/styleqr',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/var/www/styleqr/logs/pm2-error.log',
    out_file: '/var/www/styleqr/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
  }],
};
EOF

# Create logs directory
mkdir -p /var/www/styleqr/logs

echo ""
echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Clone your GitHub repository to /var/www/styleqr"
echo "2. Setup .env file with production variables"
echo "3. Run: cd /var/www/styleqr && npm install && npm run build"
echo "4. Setup SSL certificates with: certbot --nginx -d styleqr.com -d *.styleqr.com"
echo "5. Start application with: pm2 start ecosystem.config.js"
echo "6. Save PM2 configuration: pm2 save && pm2 startup"
