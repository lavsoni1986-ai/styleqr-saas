# StyleQR – Railway Deployment Guide

Deploy StyleQR to **stylerqrestaurant.in** on Railway.app.

---

## Prerequisites

- GitHub account
- Railway account ([railway.app](https://railway.app))
- Domain: **stylerqrestaurant.in** (DNS configured)
- Cashfree, Cloudinary, and SendGrid (or Resend) accounts

---

## 1. Push to GitHub

```bash
# From your project root
git add .
git commit -m "Production: stylerqrestaurant.in, Railway config"
git push origin main
```

---

## 2. Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in.
2. **New Project** → **Deploy from GitHub repo**.
3. Select your `styleqr-saas` repository.
4. Railway will detect the Dockerfile and start a build.

---

## 3. Add PostgreSQL

1. In the Railway project, click **+ New**.
2. Select **Database** → **PostgreSQL**.
3. Railway creates a Postgres service and sets `DATABASE_URL` for your app.

---

## 4. Configure Environment Variables

In Railway: **Your App** → **Variables** → **Add from .env file** or add manually.

Use `deployment/env.production.template` and replace placeholders:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://stylerqrestaurant.in` | Public app URL |
| `NEXT_PUBLIC_BASE_URL` | `https://stylerqrestaurant.in` | QR codes & menu links |
| `NEXTAUTH_URL` | `https://stylerqrestaurant.in` | Required for auth |
| `NEXTAUTH_SECRET` | *(generate)* | `openssl rand -base64 32` |
| `DATABASE_URL` | *(auto)* | Set by Postgres plugin |
| `CASHFREE_APP_ID` | *(from Cashfree)* | District billing |
| `CASHFREE_SECRET_KEY` | *(from Cashfree)* | District billing |
| `CASHFREE_WEBHOOK_SECRET` | *(from Cashfree)* | Webhook verification |
| `SENTRY_DSN` | *(from Sentry)* | Create project at sentry.io |
| `INTERNAL_API_SECRET` | *(generate)* | `openssl rand -base64 32` |
| `SMTP_*` or `RESEND_API_KEY` | *(from provider)* | Email delivery |
| `CLOUDINARY_*` | *(from Cloudinary)* | Image upload |
| `NEXT_PUBLIC_DOMAIN` | `stylerqrestaurant.in` | Branding |

**Build-time only (optional):** `SKIP_ENV_VALIDATION=true` – already set in Dockerfile for build.

---

## 5. Connect Custom Domain

1. In Railway: **Your App** → **Settings** → **Domains**.
2. Click **Custom Domain**.
3. Add `stylerqrestaurant.in` and `www.stylerqrestaurant.in` (if needed).
4. Add the CNAME record Railway shows (e.g. `stylerqrestaurant.in` → `xxx.railway.app`).
5. Wait for DNS propagation; Railway provisions SSL.

---

## 6. Deploy

1. Push to `main` → Railway builds and deploys.
2. Build: `prisma generate` + `next build`.
3. Start: `npx prisma migrate deploy && node server.js`.
4. Migrations run automatically on each deploy.

---

## 7. Post-Deploy

### Create Super Admin

```bash
# Option 1: Run locally (set DATABASE_URL to Railway Postgres connection string)
npx ts-node scripts/createSuperAdmin.ts

# Option 2: Run in Railway context (install Railway CLI: npm i -g @railway/cli)
railway run npx ts-node scripts/createSuperAdmin.ts
```

If `ts-node` is not installed: `npm install -D ts-node`

### Verify

- `https://stylerqrestaurant.in` – homepage
- `https://stylerqrestaurant.in/login` – login
- `https://stylerqrestaurant.in/api/health` – health check

---

## 8. File Overview

| File | Purpose |
|------|---------|
| `deployment/env.production.template` | All env vars for stylerqrestaurant.in |
| `railway.toml` | Start command with migrations |
| `Dockerfile` | Build + Prisma + migrations on start |
| `package.json` | `build`, `postinstall`, `db:deploy` scripts |

---

## 9. Dynamic URLs

No hardcoded IPs in app code. All URLs come from:

- `NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_APP_URL` – QR, menu, links
- `NEXTAUTH_URL` – auth callbacks
- `trustHost: true` in auth config – for Railway/proxy

---

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Set `SKIP_ENV_VALIDATION=true` for build (done in Dockerfile). |
| Auth redirects wrong | Ensure `NEXTAUTH_URL` = `https://stylerqrestaurant.in`. |
| DB connection fails | Confirm `DATABASE_URL` from Postgres plugin. |
| Migrations fail | Run `railway run npx prisma migrate deploy` manually. |
| 502 / app not starting | Check logs for missing env vars (e.g. `NEXTAUTH_SECRET`). |

---

## Summary

1. Push code to GitHub.
2. Create Railway project and connect repo.
3. Add Postgres.
4. Set env vars from `deployment/env.production.template`.
5. Add custom domain `stylerqrestaurant.in`.
6. Deploy; migrations run on start.
7. Create Super Admin user.
8. Verify at `https://stylerqrestaurant.in`.
