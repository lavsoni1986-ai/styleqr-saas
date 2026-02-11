# Railway Environment Variables – StyleQR Production

**Domain:** https://stylerqrestaurant.in

Copy these into **Railway** → **Your App** → **Variables** tab. Replace placeholders with your actual values.

**Note:** `DATABASE_URL` is auto-injected when you add the **PostgreSQL** plugin. Do not add it manually unless self-hosting DB.

---

## Required (Launch Blockers)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_SECRET` | Auth session secret | `openssl rand -base64 32` |
| `INTERNAL_API_SECRET` | Internal API protection | `openssl rand -base64 32` |
| `CASHFREE_APP_ID` | Cashfree App ID | From Cashfree Dashboard |
| `CASHFREE_SECRET_KEY` | Cashfree Secret Key | From Cashfree Dashboard |
| `SENTRY_DSN` | Sentry error tracking | From Sentry.io project |

---

## Production URLs (stylerqrestaurant.in)

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `NEXTAUTH_URL` | `https://stylerqrestaurant.in` |
| `NEXT_PUBLIC_APP_URL` | `https://stylerqrestaurant.in` |
| `NEXT_PUBLIC_BASE_URL` | `https://stylerqrestaurant.in` |

---

## Cashfree PG

| Variable | Value |
|----------|-------|
| `CASHFREE_APP_ID` | Your Cashfree App ID |
| `CASHFREE_SECRET_KEY` | Your Cashfree Secret Key |
| `CASHFREE_WEBHOOK_SECRET` | From Cashfree Webhook settings |
| `CASHFREE_ENV` | `production` |
| `NEXT_PUBLIC_CASHFREE_ENV` | `production` |
| `CASHFREE_RETURN_URL` | `https://stylerqrestaurant.in/dashboard/payments` |
| `CASHFREE_BASIC_AMOUNT_INR` | `999` |
| `CASHFREE_PRO_AMOUNT_INR` | `2499` |
| `CASHFREE_ENTERPRISE_AMOUNT_INR` | `9999` |

---

## Cloudinary (Image Upload)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Your upload preset |
| `CLOUDINARY_API_KEY` | Your API key |
| `CLOUDINARY_API_SECRET` | Your API secret |
| `NEXT_IMAGE_UNOPTIMIZED` | `true` (avoids 504 on Cloudinary) |

---

## Email (Optional)

| Variable | Value |
|----------|-------|
| `SMTP_HOST` | `smtp.sendgrid.net` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `apikey` |
| `SMTP_PASSWORD` | Your SendGrid API key |
| `SMTP_FROM` | `noreply@stylerqrestaurant.in` |
| `SMTP_FROM_NAME` | `StyleQR` |

---

## Domain & Feature Flags

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_DOMAIN` | `stylerqrestaurant.in` |
| `BETA_MODE` | `false` |
| `ENABLE_EMAIL_ALERTS` | `true` |
| `ENABLE_MONITORING` | `true` |
| `ENABLE_ANALYTICS` | `true` |

---

## Raw Editor Paste (Minimal Launch Set)

```
NODE_ENV=production
NEXTAUTH_URL=https://stylerqrestaurant.in
NEXT_PUBLIC_APP_URL=https://stylerqrestaurant.in
NEXT_PUBLIC_BASE_URL=https://stylerqrestaurant.in
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET
INTERNAL_API_SECRET=YOUR_INTERNAL_API_SECRET
CASHFREE_APP_ID=YOUR_CASHFREE_APP_ID
CASHFREE_SECRET_KEY=YOUR_CASHFREE_SECRET_KEY
CASHFREE_WEBHOOK_SECRET=YOUR_CASHFREE_WEBHOOK_SECRET
CASHFREE_ENV=production
NEXT_PUBLIC_CASHFREE_ENV=production
CASHFREE_RETURN_URL=https://stylerqrestaurant.in/dashboard/payments
SENTRY_DSN=YOUR_SENTRY_DSN
BETA_MODE=false
NEXT_PUBLIC_DOMAIN=stylerqrestaurant.in
```

Add Cloudinary and SMTP variables when configuring image upload and email features.
