# Load Testing Framework (k6)

Production-grade load testing for StyleQR SaaS. Validates homepage, auth, admin API, Stripe webhooks, health endpoint, and financial routes under load.

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed (standalone binary)
- App running: `npm run start` (or `npm run dev` for local)
- For health test: `INTERNAL_API_SECRET` in env (or pass via `-e INTERNAL_API_SECRET=...`)

## Usage

```bash
# Default BASE_URL=http://localhost:3000
npm run load:homepage
npm run load:health
npm run load:auth
npm run load:admin
npm run load:webhook
npm run load:stress
```

With custom URL and secrets:

```bash
k6 run -e BASE_URL=https://staging.example.com -e INTERNAL_API_SECRET=xxx load-tests/health.js
k6 run -e BASE_URL=https://staging.example.com -e TEST_EMAIL=load@test.com -e TEST_PASSWORD=secret load-tests/auth.js
```

## Test Summary

| Test      | VUs  | Duration | Target                   | Thresholds                     |
|-----------|------|----------|--------------------------|--------------------------------|
| homepage  | 100  | 30s      | GET /                    | p95<500ms, error<1%            |
| health    | 50   | 30s      | GET /api/internal/health | p95<500ms, error<1%            |
| auth      | 20   | 30s      | POST /api/auth/login     | p95<500ms, error<1%            |
| admin     | 20   | 30s      | GET /api/admin/orders    | p95<500ms, 401 expected        |
| webhook   | 50   | 30s      | POST /api/stripe/webhook | p95<500ms, 400 expected, no 5xx|
| stress    | ramp | ~4min    | Mixed endpoints          | p95<500ms, no 5xx              |

## Validation Checklist

- [ ] Server does not crash under 300 concurrent users
- [ ] Financial routes (billing, settlements) do not error (401 acceptable without auth)
- [ ] Webhook handles concurrent hits with invalid signature (returns 400, not 500)
- [ ] Health endpoint remains responsive under load
- [ ] Rate-limiting not yet implemented (auth test measures baseline for future rate-limit tuning)

## Memory Monitoring (Stress Test)

During `npm run load:stress`:

1. Monitor Node memory: `pm2 monit` or `ps -o rss= -p <pid>`
2. Ensure no memory leak (heap stabilizes)
3. Ensure CPU stable (no sustained 100%)
4. Check logs for errors (Sentry, pino)
