# Railway Environment Variables – Copy & Paste

Paste these into **Railway** → **Your App** → **Variables** → **Raw Editor** (or add one by one).

Replace placeholders:
- `YOUR_NEXTAUTH_SECRET` → `openssl rand -base64 32`
- `YOUR_INTERNAL_API_SECRET` → `openssl rand -base64 32`
- `YOUR_CASHFREE_APP_ID` → from Cashfree Dashboard
- `YOUR_CASHFREE_SECRET_KEY` → from Cashfree Dashboard
- `YOUR_CASHFREE_WEBHOOK_SECRET` → from Cashfree Dashboard
- `YOUR_SENTRY_DSN` → from Sentry.io (create project)

---

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

---

**Note:** `DATABASE_URL` is auto-injected when you add the **PostgreSQL** plugin. Do not add it manually.
