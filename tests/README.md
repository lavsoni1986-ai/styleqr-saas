# 🧪 StyleQR SaaS - Test Suite

Comprehensive testing infrastructure for the StyleQR SaaS platform.

## 📁 Test Structure

```
tests/
├── ui/                    # UI/End-to-End tests
│   ├── qr-flow.spec.ts    # Customer QR → Order flow
│   ├── dashboard.spec.ts  # Restaurant dashboard tests
│   └── admin.spec.ts      # Admin panel tests
├── api/                   # API tests
│   ├── auth.spec.ts       # Authentication endpoints
│   ├── orders.spec.ts     # Order endpoints
│   └── menu.spec.ts       # Menu endpoints
└── load/                  # Load/Performance tests
    └── qr-load.js         # k6 load test
```
Playwright config: `playwright.config.ts` at project root.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install -D @playwright/test
npx playwright install
npm install -D k6
```

### 2. Run All Tests

```bash
# UI + API tests
npm run test

# UI tests only
npm run test:ui

# API tests only
npm run test:api

# Load tests
npm run test:load
```

### 3. View Test Reports

```bash
npx playwright show-report
```

## 📋 Test Coverage

### ✅ UI Tests

- **QR Flow**: QR scan → Menu → Cart → Order placement
- **Dashboard**: Login → Dashboard → Menu management → QR generation
- **Admin**: Super admin login → Platform management → White-label management

### ✅ API Tests

- **Authentication**: Login, signup, logout
- **Orders**: Order creation, retrieval, validation
- **Menu**: Menu item CRUD, QR resolution

### ✅ Load Tests

- **QR Load**: 100 concurrent users, 2-minute duration
- **Thresholds**: <2s response time, <5% error rate

## 🔧 Configuration

### Environment Variables

```bash
BASE_URL=http://localhost:3000  # Default test URL
```

### Playwright Config

See `playwright.config.ts` (project root) for:
- Browser configuration
- Timeout settings
- Screenshot/video on failure
- CI/CD settings

## 📊 Test Reports

- **HTML Report**: `npx playwright show-report`
- **JSON Report**: `test-results/results.json`
- **Load Test**: `test-results/load-summary.json`

## 🎯 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 🐛 Troubleshooting

### Tests Fail on First Run

1. Ensure dev server is running: `npm run dev`
2. Check BASE_URL matches your server
3. Verify test data exists in database

### Load Tests Fail

1. Ensure k6 is installed: `k6 version`
2. Check server can handle load
3. Adjust thresholds in `qr-load.js`

### Authentication Tests Fail

1. Ensure test users exist in database
2. Update credentials in test files
3. Check session cookie handling

## 📈 Performance Benchmarks

- **QR Resolution**: <500ms
- **Menu Load**: <1s
- **Order Creation**: <1s
- **Dashboard Load**: <2s

## 🔒 Security Testing

- ✅ Authentication enforcement
- ✅ Authorization checks
- ✅ Tenant isolation
- ✅ Input validation
- ✅ SQL injection prevention

---

**Test Suite Status**: ✅ Production Ready  
**Last Updated**: 2025-01-09
