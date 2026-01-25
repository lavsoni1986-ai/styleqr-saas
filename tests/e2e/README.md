# StyleQR E2E Test Suite

## Test Structure

```
tests/e2e/
├── helpers/
│   ├── auth.ts          # Authentication helpers
│   ├── test-data.ts     # Test data seeding
│   ├── api-client.ts    # API client for backend operations
│   └── page-objects.ts  # Page Object Model classes
├── .auth/
│   └── owner.json       # Authenticated state (generated)
├── auth.spec.ts         # Authentication tests
├── billing.spec.ts      # Billing POS tests
├── kitchen.spec.ts      # Kitchen display tests
├── offline.spec.ts      # Offline mode tests
├── payments.spec.ts     # Payment engine tests
├── qr-order.spec.ts     # QR ordering flow tests
├── reports.spec.ts      # Reports dashboard tests
├── smoke.spec.ts        # Smoke tests
└── global-setup.ts      # Global test setup (auth)
```

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# View HTML report
npm run test:e2e:report

# Run specific test file
npx playwright test tests/e2e/smoke.spec.ts

# Run on specific browser
npx playwright test --project="Mobile Chrome"
```

## Test Data Seeding

Tests automatically seed required data:
- Authentication state (via global-setup.ts)
- Test orders (beforeEach in kitchen tests)
- Test bills (beforeEach in billing tests)

## Offline Testing

Offline tests use `context.route()` to mock API failures instead of browser-level offline mode for better reliability.

## CI/CD

Tests are configured for CI:
- Retries: 2 (CI only)
- Screenshots: On failure
- Videos: On failure
- Traces: On retry
- Workers: 1 (CI), parallel (local)
