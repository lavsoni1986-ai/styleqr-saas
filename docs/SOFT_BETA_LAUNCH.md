# Soft Beta Launch (7-Day Controlled)

## Beta Mode Flag

Set `BETA_MODE=true` in environment to enable:

- **Beta badge** – Subtle "Beta" badge in all admin dashboards (restaurant, platform, district, partner)
- **Extra financial logging** – Info-level logs for `/api/billing` and `/api/payments/confirm` when BETA_MODE
- **Stripe test enforcement** – Live keys (`sk_live_*`) are **blocked** when BETA_MODE; use `sk_test_*` only
- **Safety guards** – District limit (>5), payout failure rate (>5%), 503 threshold (>10) trigger alerts

## Stripe Safety

- **BETA_MODE=true**: `STRIPE_SECRET_KEY` must start with `sk_test_`. If `sk_live_` is set, startup fails with error.
- **BETA_MODE=false**: Warning logged if live key detected (non-blocking).

## Daily Beta Health Report

**Endpoint:** `GET /api/internal/beta-report`  
**Auth:** `Authorization: Bearer <INTERNAL_API_SECRET>` or `x-internal-secret` header

**Response:**
```json
{
  "totalOrdersToday": 42,
  "totalRevenueToday": 12500.50,
  "failedWebhooks": 0,
  "429Count": 2,
  "503Count": 0,
  "activeRestaurants": 8,
  "lastErrorTimestamp": "2025-02-10T15:30:00.000Z",
  "districtCount": 3,
  "financialAlerts": 0,
  "timestamp": "2025-02-10T16:00:00.000Z"
}
```

Call daily (e.g. via cron) to monitor beta health.

## Safety Guards

| Guard | Threshold | Action |
|-------|-----------|--------|
| Districts created | > 5 | `logger.warn` |
| Payout failure rate | > 5% | `logger.error` (financial alert) |
| 503 errors | > 10 | `logger.error` (system alert) |

## Log Summary Script

```bash
# From log file
npm run log:summary app.log

# From stdin (e.g. PM2 logs)
pm2 logs --raw --lines 10000 | node scripts/log-summary.js
```

Summarizes past 24h: errors, warns, financial alerts, rate-limit hits.

## Beta Users

- **Manual onboarding only** – No public signup or marketing
- **No performance regression** – Beta logging is info-level only; no heavy ops
- **No public banners** – Beta badge only in dashboards for admins
