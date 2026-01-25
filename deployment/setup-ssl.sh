#!/bin/bash
# SSL Certificate Setup Script for StyleQR SaaS
# Setup Let's Encrypt SSL for main domain and wildcard subdomain

set -e

DOMAIN="styleqr.com"
EMAIL="admin@styleqr.com"  # Change to your email

echo "🔐 Setting up SSL certificates for $DOMAIN..."

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt-get update -y
    apt-get install -y certbot python3-certbot-nginx
fi

# Create directory for ACME challenge
mkdir -p /var/www/certbot

# Get SSL certificate for main domain (HTTP-01 challenge)
echo "📜 Requesting SSL certificate for $DOMAIN..."
certbot certonly --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --keep-until-expiring

# Note: Wildcard SSL (*.styleqr.com) requires DNS-01 challenge
# This requires DNS API access (e.g., Cloudflare, AWS Route53)
# For DNS-01 challenge, use:
# certbot certonly --manual --preferred-challenges dns \
#     --email "$EMAIL" \
#     -d "$DOMAIN" \
#     -d "*.$DOMAIN"

echo ""
echo "✅ SSL certificates installed!"
echo ""
echo "Certificate location:"
echo "  Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo "📝 Setting up auto-renewal..."

# Add auto-renewal cron job
(crontab -l 2>/dev/null; echo "0 0 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo "✅ Auto-renewal configured!"
echo ""
echo "Next steps:"
echo "1. Configure Nginx with SSL certificates (see nginx.conf)"
echo "2. Test Nginx config: nginx -t"
echo "3. Reload Nginx: systemctl reload nginx"
echo "4. Verify SSL: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
