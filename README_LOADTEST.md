# StyleQR Load Testing with k6

Load tests for QR menu, order flow, login API, and dashboard.

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed (e.g. `winget install k6` or `choco install k6`, or [k6.io](https://k6.io))
- App running: `npm run dev` or `npm run build && npm run start`
- For **auth** and **dashboard**: a user. Create one via signup or `npm run seed:admin` and use those credentials.
- For **qr-flow** and **order-flow**: seeded `Table` (with `qrToken`) and `MenuItem` (for `MENU_ITEM_ID`). Use your Prisma/seed data.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BASE_URL` | App base URL | `http://localhost:3000` or `http://192.168.31.135:3000` |
| `VUS` | Virtual users (100, 500, 1000) | `100` |
| `QR_TOKEN` | Table QR token (qr-flow, order-flow) | From `Table.qrToken` |
| `RESTAURANT_ID` | Restaurant ID (qr-flow, menu) | From `Table.restaurantId` or `Restaurant.id` |
| `MENU_ITEM_ID` | Menu item ID for orders (order-flow) | From `MenuItem.id`; comma-separated for multiple |
| `LOADTEST_EMAIL` | Login email (auth, dashboard) | `owner@example.com` |
| `LOADTEST_PASSWORD` | Login password (auth, dashboard) | your password |

## Run

Base URL defaults to `http://localhost:3000` if `BASE_URL` is not set.

### Quick (auth, 100 VUs, default URL)

```bash
npm run loadtest
```

### By scenario

```bash
# QR: /api/qr, /api/menu (use seeded QR_TOKEN + RESTAURANT_ID for 200s)
npm run loadtest:qr

# Order: POST /api/orders, GET /api/orders/:id (needs QR_TOKEN, MENU_ITEM_ID)
npm run loadtest:order

# Auth: POST /api/auth/login
npm run loadtest:auth

# Dashboard: login then GET /dashboard (needs LOADTEST_EMAIL, LOADTEST_PASSWORD)
npm run loadtest:dashboard
```

### With options

```bash
# 500 VUs, LAN URL
k6 run -e VUS=500 -e BASE_URL=http://192.168.31.135:3000 loadtest/scenarios/auth.test.js

# Auth with credentials
k6 run -e VUS=100 -e LOADTEST_EMAIL=u@x.com -e LOADTEST_PASSWORD=secret loadtest/scenarios/auth.test.js

# Order flow with seeded data
k6 run -e VUS=100 -e QR_TOKEN=abc123 -e MENU_ITEM_ID=clxx... loadtest/scenarios/order-flow.test.js
```

## Metrics

- **p95 latency**: 95th percentile HTTP request duration.
- **Failure rate**: `http_req_failed` (and custom `errors` where used).
- Thresholds (in `loadtest/k6.config.js`): `p(95)<5000ms`, `http_req_failed<10%`. A scenario fails if these are not met.

## Sample test data

For **realistic** runs (200/201 and low failure rate):

1. **Restaurant + tables + menu**
   - Create via signup → dashboard, or your seed.
   - From DB: `Table.qrToken`, `Table.restaurantId`, `MenuItem.id`.

2. **User (auth + dashboard)**
   - Signup at `/signup` or `npm run seed:admin`.
   - Set `LOADTEST_EMAIL` and `LOADTEST_PASSWORD`.

3. **Minimal order-flow**
   - One `Table` with `qrToken`.
   - One `MenuItem` in that restaurant.
   - `QR_TOKEN=<Table.qrToken>`, `MENU_ITEM_ID=<MenuItem.id>`.

Without seeded data, qr/order tests will still run but return 400/404; failure rate will be high. Use for smoke or to verify the load test harness.

## Files

```
loadtest/
  k6.config.js           # getOptions(VUS), shared thresholds
  scenarios/
    qr-flow.test.js      # /api/qr, /api/menu
    order-flow.test.js   # POST /api/orders, GET /api/orders/:id
    auth.test.js         # POST /api/auth/login
    dashboard.test.js    # login + GET /dashboard
```

## npm scripts

| Script | Command |
|--------|---------|
| `loadtest` | `k6 run loadtest/scenarios/auth.test.js` |
| `loadtest:qr` | `k6 run loadtest/scenarios/qr-flow.test.js` |
| `loadtest:order` | `k6 run loadtest/scenarios/order-flow.test.js` |
| `loadtest:auth` | `k6 run loadtest/scenarios/auth.test.js` |
| `loadtest:dashboard` | `k6 run loadtest/scenarios/dashboard.test.js` |
