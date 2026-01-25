#!/bin/bash
# Monitoring Setup Script for StyleQR SaaS
# Sets up PM2 monitoring, log rotation, and health checks

set -e

APP_DIR="/var/www/styleqr"

echo "📊 Setting up monitoring for StyleQR SaaS..."

# Create log rotation config for PM2
cat > /etc/logrotate.d/pm2 <<'EOF'
/var/www/styleqr/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create health check script
cat > "$APP_DIR/health-check.sh" <<'EOF'
#!/bin/bash
# Health check script for StyleQR SaaS
# Returns 0 if healthy, 1 if unhealthy

HEALTH_URL="http://localhost:3000/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$RESPONSE" -eq 200 ]; then
    exit 0
else
    # Restart application if unhealthy
    pm2 restart styleqr-saas
    exit 1
fi
EOF

chmod +x "$APP_DIR/health-check.sh"

# Add health check to cron (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/health-check.sh >> $APP_DIR/logs/health-check.log 2>&1") | crontab -

# Setup PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

echo "✅ Monitoring setup complete!"
echo ""
echo "Health check runs every 5 minutes"
echo "Logs are rotated daily and kept for 14 days"
echo ""
echo "View health check logs:"
echo "  tail -f $APP_DIR/logs/health-check.log"
