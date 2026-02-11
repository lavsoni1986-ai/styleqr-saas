# Railway Deployment Checklist – stylerqrestaurant.in

Production deployment checklist for StyleQR on Railway.app with Cashfree onboarding.

---

## 1. Production URL Audit ✅

| Item | Status |
|------|--------|
| Hardcoded `192.168.31.135` removed from runtime code & templates | ✅ |
| `payments/create-order` uses `NEXT_PUBLIC_BASE_URL` → `NEXTAUTH_URL` → `NEXT_PUBLIC_APP_URL` | ✅ |
| `.env.example` no longer contains hardcoded IP | ✅ |
| Production: `NEXT_PUBLIC_BASE_URL=https://stylerqrestaurant.in` | Set in Railway |

---

## 2. Prisma & DB Configuration ✅

| Item | Status |
|------|--------|
| `npx prisma generate` | In Dockerfile build step |
| `npx prisma migrate deploy` | In Dockerfile CMD & railway.toml startCommand |
| `npx prisma db push` | Use for fresh DB without migrations; `db:push` script in package.json |
| `DATABASE_URL` | Injected by Railway Postgres plugin |

**Railway build flow:** `npm ci` → `prisma generate` → `next build` → (at runtime) `prisma migrate deploy` → `node server.js`

---

## 3. Authentication & Security ✅

| Item | Status |
|------|--------|
| `trustHost: true` in auth-config.ts | ✅ Enabled for production domain |
| `pageGuard` on `/platform/*` | ✅ All routes require SUPER_ADMIN |
| Platform layout | ✅ `pageGuard(user, ["SUPER_ADMIN"])` |
| Platform API routes | ✅ `apiGuard` with `["SUPER_ADMIN"]` |

---

## 4. Cashfree & Legal Pages ✅

| Route | Public | Content |
|-------|--------|--------|
| `/contact` | ✅ No auth | Shahdol address, 9753239303, email |
| `/terms-and-conditions` | ✅ No auth | Terms |
| `/refund-policy` | ✅ No auth | Refund policy |
| `/privacy-policy` | ✅ No auth | Privacy policy |

**Contact page:** Housing Board Colony, Shahdol, Madhya Pradesh, 484001 | +91 9753239303

---

## 5. Railway Environment Variables

Add these in **Railway** → **Your App** → **Variables**:

### Required (Core)

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | *(auto)* | From Postgres plugin |
| `NEXTAUTH_SECRET` | *(generate)* | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://stylerqrestaurant.in` | |
| `NEXT_PUBLIC_APP_URL` | `https://stylerqrestaurant.in` | |
| `NEXT_PUBLIC_BASE_URL` | `https://stylerqrestaurant.in` | QR codes, menu links, Cashfree URLs |

### Cashfree (Required for onboarding)

| Variable | Value | Notes |
|----------|-------|-------|
| `CASHFREE_APP_ID` | *(from Cashfree)* | Dashboard → API Keys |
| `CASHFREE_SECRET_KEY` | *(from Cashfree)* | Dashboard → API Keys |
| `CASHFREE_WEBHOOK_SECRET` | *(from Cashfree)* | Dashboard → Webhooks |
| `CASHFREE_ENV` | `production` | |
| `NEXT_PUBLIC_CASHFREE_ENV` | `production` | Client SDK |
| `CASHFREE_RETURN_URL` | `https://stylerqrestaurant.in/dashboard/payments` | Optional; defaults from NEXT_PUBLIC_BASE_URL |

### Internal & Monitoring

| Variable | Value | Notes |
|----------|-------|-------|
| `INTERNAL_API_SECRET` | *(generate)* | `openssl rand -base64 32` |
| `SENTRY_DSN` | *(from Sentry)* | Create project at sentry.io |

### Optional (Features)

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | *(from Cloudinary)* | Image upload |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | *(from Cloudinary)* | |
| `CLOUDINARY_API_KEY` | *(from Cloudinary)* | |
| `CLOUDINARY_API_SECRET` | *(from Cloudinary)* | |
| `SMTP_HOST` | `smtp.sendgrid.net` | Email |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `apikey` | |
| `SMTP_PASSWORD` | *(from SendGrid)* | |
| `SMTP_FROM` | `noreply@stylerqrestaurant.in` | |
| `NEXT_PUBLIC_DOMAIN` | `stylerqrestaurant.in` | Branding |
| `BETA_MODE` | `false` | Production |
| `NEXT_IMAGE_UNOPTIMIZED` | `true` | If Cloudinary 504 timeout |

---

## 6. Cashfree Dashboard Configuration

1. **API Keys:** Add production App ID and Secret Key to Railway.
2. **Webhooks:** Add notify URL: `https://stylerqrestaurant.in/api/payments/webhook`
3. **Return URL:** `https://stylerqrestaurant.in/dashboard/payments` (or via env).
4. **Business details:** Ensure Shahdol address and 9753239303 are in Cashfree profile.

---

## 7. Post-Deploy Verification

- [ ] `https://stylerqrestaurant.in` – Homepage loads
- [ ] `https://stylerqrestaurant.in/login` – Login works
- [ ] `https://stylerqrestaurant.in/contact` – Contact page (Shahdol, 9753239303)
- [ ] `https://stylerqrestaurant.in/terms-and-conditions` – Terms
- [ ] `https://stylerqrestaurant.in/refund-policy` – Refund policy
- [ ] `https://stylerqrestaurant.in/api/health` – Health check 200
- [ ] Super Admin created via `railway run npx ts-node scripts/createSuperAdmin.ts`
- [ ] Cashfree payment flow test (sandbox first)

---

**Last updated:** 2026-02-11  
**Production URL:** https://stylerqrestaurant.in

**Paste-ready env vars:** See `RAILWAY_ENV_VARIABLES.md`
