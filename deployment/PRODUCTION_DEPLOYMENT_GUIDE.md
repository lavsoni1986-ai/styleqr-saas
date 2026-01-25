# 🚀 Production Deployment Guide - StyleQR SaaS

Complete guide for deploying StyleQR multi-district white-label SaaS platform to production.

---

## 📋 Prerequisites

- Ubuntu 22.04 LTS VPS (DigitalOcean / AWS / Hostinger)
- Domain name (e.g., `styleqr.com`)
- SSH access to server
- Root or sudo access
- GitHub repository access

---

## 🔧 PHASE 4.1 — SERVER SETUP

### Step 1: Connect to Server

```bash
ssh root@your-server-ip
```

### Step 2: Run Server Setup Script

```bash
# Download and run setup script
curl -O https://raw.githubusercontent.com/your-repo/styleqr-saas/main/deployment/server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

Or manually:

```bash
# Update system
sudo apt-get update -y && sudo apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Setup firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### Step 3: Create Application Directory

```bash
sudo mkdir -p /var/www/styleqr
sudo chown -R $USER:$USER /var/www/styleqr
```

---

## 🌐 PHASE 4.2 — DOMAIN & DNS

### Step 1: Configure DNS Records

In your domain registrar (e.g., Cloudflare, Namecheap):

**A Records:**
```
Type: A
Name: @ (or styleqr.com)
Value: YOUR_VPS_IP
TTL: 3600

Type: A
Name: * (wildcard)
Value: YOUR_VPS_IP
TTL: 3600
```

**CNAME Records (optional):**
```
Type: CNAME
Name: www
Value: styleqr.com
TTL: 3600
```

### Step 2: Verify DNS

```bash
# Check DNS propagation
dig styleqr.com
dig delhi.styleqr.com
```

---

## 🔐 PHASE 4.3 — SSL (HTTPS)

### Step 1: Setup SSL Certificates

```bash
# Copy SSL setup script
curl -O https://raw.githubusercontent.com/your-repo/styleqr-saas/main/deployment/setup-ssl.sh
chmod +x setup-ssl.sh

# Edit EMAIL variable first
nano setup-ssl.sh

# Run SSL setup
sudo ./setup-ssl.sh
```

### Step 2: Configure Nginx with SSL

```bash
# Copy Nginx config
sudo cp deployment/nginx.conf /etc/nginx/sites-available/styleqr
sudo ln -s /etc/nginx/sites-available/styleqr /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 3: Verify SSL

Visit:
- https://styleqr.com
- https://delhi.styleqr.com (test subdomain)

Check SSL rating:
- https://www.ssllabs.com/ssltest/analyze.html?d=styleqr.com

---

## 📦 PHASE 4.4 — APP DEPLOYMENT

### Step 1: Clone Repository

```bash
cd /var/www/styleqr
git clone https://github.com/your-username/styleqr-saas.git .
```

### Step 2: Setup Environment Variables

```bash
# Copy example env file
cp deployment/.env.production.example .env

# Edit with production values
nano .env
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Random 32+ character string
- `SMTP_PASSWORD` - Email service API key
- `NEXT_PUBLIC_CLOUDINARY_*` - Cloudinary credentials

### Step 3: Install Dependencies

```bash
cd /var/www/styleqr
npm ci --production=false
```

### Step 4: Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Create Super Admin
npm run seed:admin
```

### Step 5: Build Application

```bash
npm run build
```

### Step 6: Start with PM2

```bash
# Copy ecosystem config
cp deployment/ecosystem.config.js ecosystem.config.js

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 7: Setup Deployment Script

```bash
# Copy deployment script
cp deployment/deploy.sh deploy.sh
chmod +x deploy.sh
```

**Future deployments:**
```bash
./deploy.sh
```

---

## 🗄️ PHASE 4.5 — DATABASE

### Step 1: Create PostgreSQL Database

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE styleqr_prod;
CREATE USER styleqr_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE styleqr_prod TO styleqr_user;
\q
```

### Step 2: Update Prisma Schema

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 3: Update DATABASE_URL

In `.env`:

```bash
DATABASE_URL="postgresql://styleqr_user:YOUR_SECURE_PASSWORD@localhost:5432/styleqr_prod?schema=public"
```

### Step 4: Run Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### Step 5: Setup Auto Backups

```bash
# Copy backup script
sudo cp deployment/database-backup.sh /usr/local/bin/styleqr-backup.sh
sudo chmod +x /usr/local/bin/styleqr-backup.sh

# Add to cron (runs daily at 2 AM)
sudo crontab -e
```

Add:
```
0 2 * * * /usr/local/bin/styleqr-backup.sh
```

---

## 📧 PHASE 4.6 — EMAIL SERVICE

### Option 1: SendGrid (Recommended)

1. Sign up at https://sendgrid.com
2. Create API Key
3. Update `.env`:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
SMTP_FROM=noreply@styleqr.com
```

### Option 2: Zoho Mail

1. Create Zoho Mail account
2. Enable SMTP
3. Update `.env`:

```bash
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your-email@zoho.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@zoho.com
```

### Option 3: Gmail (Not Recommended for Production)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## 📊 PHASE 4.7 — MONITORING & LOGS

### PM2 Monitoring

```bash
# View logs
pm2 logs styleqr-saas

# Monitor in real-time
pm2 monit

# View status
pm2 status

# Restart app
pm2 restart styleqr-saas
```

### Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/styleqr-access.log

# Error logs
tail -f /var/log/nginx/styleqr-error.log
```

### Application Logs

```bash
# PM2 logs
tail -f /var/www/styleqr/logs/pm2-out.log
tail -f /var/www/styleqr/logs/pm2-error.log
```

### Health Check Script

Create `/var/www/styleqr/health-check.sh`:

```bash
#!/bin/bash
curl -f http://localhost:3000/api/health || pm2 restart styleqr-saas
```

Add to cron (every 5 minutes):

```
*/5 * * * * /var/www/styleqr/health-check.sh
```

---

## 🔒 PHASE 4.8 — SECURITY

### 1. Enable Rate Limiting

Already configured in `nginx.conf`:
- API routes: 10 requests/second
- Auth routes: 5 requests/second

### 2. Secure Environment Variables

```bash
# Set correct permissions
chmod 600 /var/www/styleqr/.env
chown $USER:$USER /var/www/styleqr/.env
```

### 3. Database Security

```bash
# Disable remote PostgreSQL access (already default)
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

### 4. SSH Security

```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Restart SSH
sudo systemctl restart sshd
```

### 5. Firewall Rules

```bash
# View current rules
sudo ufw status

# Allow specific IPs only (optional)
sudo ufw allow from YOUR_IP_ADDRESS to any port 22
```

---

## ✅ VERIFICATION CHECKLIST

### Server Setup
- [ ] Node.js 20 installed
- [ ] PM2 installed and running
- [ ] Nginx installed and running
- [ ] PostgreSQL installed
- [ ] Firewall configured

### Domain & DNS
- [ ] A record for main domain
- [ ] A record for wildcard subdomain
- [ ] DNS propagated (checked with `dig`)

### SSL
- [ ] SSL certificate installed
- [ ] Auto-renewal configured
- [ ] HTTPS working on main domain
- [ ] HTTPS working on subdomains
- [ ] SSL Labs rating A or A+

### Application
- [ ] Repository cloned
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Database migrated
- [ ] Application built
- [ ] PM2 running application

### Database
- [ ] PostgreSQL database created
- [ ] Migrations applied
- [ ] Super Admin created
- [ ] Backups scheduled

### Email
- [ ] SMTP configured
- [ ] Test email sent
- [ ] Email alerts working

### Monitoring
- [ ] PM2 monitoring enabled
- [ ] Logs accessible
- [ ] Health check configured

### Security
- [ ] Rate limiting enabled
- [ ] Environment variables secured
- [ ] SSH secured
- [ ] Firewall active

---

## 🚀 DEPLOYMENT COMMANDS

### Initial Deployment

```bash
cd /var/www/styleqr
git clone https://github.com/your-repo/styleqr-saas.git .
cp deployment/.env.production.example .env
nano .env  # Edit with production values
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Future Deployments

```bash
cd /var/www/styleqr
./deploy.sh
```

---

## 📞 TROUBLESHOOTING

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs styleqr-saas --lines 100

# Check environment variables
pm2 env 0

# Restart application
pm2 restart styleqr-saas
```

### SSL Certificate Issues

```bash
# Renew certificate manually
sudo certbot renew --force-renewal

# Check certificate expiration
sudo certbot certificates
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U styleqr_user -d styleqr_prod

# Check Prisma connection
npx prisma db pull
```

### Nginx Errors

```bash
# Test Nginx config
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Reload Nginx
sudo systemctl reload nginx
```

---

## ✅ FINAL STATUS

After completing all phases:

- ✅ **Live Domain:** https://styleqr.com
- ✅ **SSL Enabled:** HTTPS on all routes
- ✅ **Subdomain Routing:** *.styleqr.com working
- ✅ **Admin Panels:** /platform, /district, /partner accessible
- ✅ **Kitchen System:** /kitchen working
- ✅ **QR Menu:** /menu working
- ✅ **Email Alerts:** Configured and working
- ✅ **Auto Backups:** Daily backups enabled
- ✅ **Monitoring:** PM2 monitoring active
- ✅ **Security:** Rate limiting, firewall, SSL configured

**Your StyleQR SaaS platform is now production-ready! 🎉**

---

**Deployment Date:** 2025-01-09  
**Status:** ✅ **READY FOR DEPLOYMENT**  
**Production URL:** https://styleqr.com
