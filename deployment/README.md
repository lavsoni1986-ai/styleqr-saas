# 🚀 StyleQR SaaS - Production Deployment

This directory contains all deployment scripts and configurations for the StyleQR multi-district white-label SaaS platform.

---

## 📁 Files Overview

### Scripts

- **`server-setup.sh`** - Initial server setup (Ubuntu 22.04)
- **`setup-ssl.sh`** - SSL certificate setup (Let's Encrypt)
- **`deploy.sh`** - Production deployment script
- **`database-backup.sh`** - Daily database backup script

### Configuration

- **`nginx.conf`** - Nginx reverse proxy configuration
- **`ecosystem.config.js`** - PM2 cluster configuration
- **`env.production.template`** - Production environment variables template

### Documentation

- **`PRODUCTION_DEPLOYMENT_GUIDE.md`** - Complete deployment guide
- **`migrate-to-postgresql.md`** - Database migration guide

---

## 🚀 Quick Start

### 1. Server Setup

```bash
# On your Ubuntu VPS
curl -O https://raw.githubusercontent.com/your-repo/styleqr-saas/main/deployment/server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

### 2. Clone Repository

```bash
cd /var/www/styleqr
git clone https://github.com/your-repo/styleqr-saas.git .
```

### 3. Configure Environment

```bash
cp deployment/env.production.template .env
nano .env  # Edit with production values
```

### 4. Setup SSL

```bash
cd deployment
chmod +x setup-ssl.sh
sudo ./setup-ssl.sh
```

### 5. Configure Nginx

```bash
sudo cp deployment/nginx.conf /etc/nginx/sites-available/styleqr
sudo ln -s /etc/nginx/sites-available/styleqr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Deploy Application

```bash
cd /var/www/styleqr
chmod +x deployment/deploy.sh
./deployment/deploy.sh
```

### 7. Setup Backups

```bash
sudo cp deployment/database-backup.sh /usr/local/bin/styleqr-backup.sh
sudo chmod +x /usr/local/bin/styleqr-backup.sh
sudo crontab -e  # Add: 0 2 * * * /usr/local/bin/styleqr-backup.sh
```

---

## 📋 Deployment Checklist

- [ ] Server setup complete
- [ ] Domain DNS configured
- [ ] SSL certificates installed
- [ ] Environment variables configured
- [ ] Database migrated (SQLite → PostgreSQL)
- [ ] Application built and running
- [ ] Nginx configured and running
- [ ] PM2 monitoring active
- [ ] Email service configured
- [ ] Backups scheduled
- [ ] Health checks configured
- [ ] Security hardened

---

## 🔒 Security Notes

1. **Never commit `.env` files** to Git
2. **Use strong passwords** for database and JWT
3. **Enable firewall** (UFW) with minimal required ports
4. **Keep system updated** with `apt-get update && apt-get upgrade`
5. **Use SSH keys** instead of passwords
6. **Rotate secrets** regularly

---

## 📞 Support

For deployment issues:
1. Check logs: `pm2 logs styleqr-saas`
2. Check Nginx: `sudo nginx -t`
3. Check database: `npx prisma db pull`
4. Review deployment guide: `PRODUCTION_DEPLOYMENT_GUIDE.md`

---

**Status:** ✅ Ready for Production Deployment
