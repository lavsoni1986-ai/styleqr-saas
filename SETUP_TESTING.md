# 🧪 Testing Infrastructure Setup Guide

## 📋 Overview

This guide sets up comprehensive testing for the StyleQR SaaS platform:
- **Playwright**: UI and API testing
- **k6**: Load/performance testing
- **CI/CD Ready**: GitHub Actions compatible

---

## 🚀 Installation Steps

### Step 1: Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

This installs:
- Playwright test framework
- Chromium, Firefox, WebKit browsers
- Test dependencies

### Step 2: Install k6 (Load Testing)

**Windows:**
```powershell
# Download from https://k6.io/docs/getting-started/installation/
# Or use Chocolatey:
choco install k6
```

**Verify:**
```bash
k6 version
```

### Step 3: Add npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test tests/ui",
    "test:api": "playwright test tests/api",
    "test:load": "k6 run tests/load/qr-load.js",
    "test:report": "playwright show-report"
  }
}
```

---

## ✅ Verification

### 1. Start Dev Server

```bash
npm run dev
```

### 2. Run Tests

```bash
# All tests
npm run test

# UI tests only
npm run test:ui

# API tests only
npm run test:api
```

### 3. View Reports

```bash
npx playwright show-report
```

---

## 📊 Test Coverage

### UI Tests (`tests/ui/`)

✅ **qr-flow.spec.ts**
- QR scan → Menu load
- Add items to cart
- Place order
- Order confirmation

✅ **dashboard.spec.ts**
- Restaurant login
- Dashboard visibility
- Menu management
- QR generation
- Order visibility

✅ **admin.spec.ts**
- Super admin login
- Platform stats
- Restaurant management
- White-label management
- Authorization checks

### API Tests (`tests/api/`)

✅ **auth.spec.ts**
- POST /api/auth/login
- POST /api/auth/signup
- POST /api/auth/logout
- Error handling

✅ **orders.spec.ts**
- POST /api/orders (QR token)
- POST /api/order (direct)
- GET /api/admin/orders
- Authentication checks

✅ **menu.spec.ts**
- GET /api/menu
- GET /api/admin/menu-items
- POST /api/admin/menu-items
- GET /api/qr

### Load Tests (`tests/load/`)

✅ **qr-load.js**
- 100 concurrent users
- QR resolution
- Menu page load
- Menu API calls
- Performance thresholds

---

## 🎯 Test Data Setup

### Create Test Users

You may need to create test users in your database:

```sql
-- Restaurant Owner
INSERT INTO User (id, email, name, password, role) 
VALUES ('test-owner', 'restaurant@test.com', 'Test Owner', '$2a$12$...', 'RESTAURANT_OWNER');

-- Super Admin
INSERT INTO User (id, email, name, password, role) 
VALUES ('test-admin', 'admin@test.com', 'Test Admin', '$2a$12$...', 'SUPER_ADMIN');
```

Or use the seed scripts:
```bash
npm run seed:admin
```

---

## 🔧 Configuration

### Playwright Config

Edit `playwright.config.ts` (project root):

```typescript
use: {
  baseURL: process.env.BASE_URL || "http://localhost:3000",
  // ... other settings
}
```

### Environment Variables

Create `.env.test`:

```bash
BASE_URL=http://localhost:3000
DATABASE_URL=file:./test.db
JWT_SECRET=test-secret-key
```

---

## 📈 Performance Benchmarks

Expected performance (from load tests):

- **QR Resolution**: <500ms (p95)
- **Menu Load**: <1s (p95)
- **Order Creation**: <1s (p95)
- **Error Rate**: <5%

---

## 🚨 Troubleshooting

### Issue: Tests fail with "Page not found"

**Solution:**
1. Ensure dev server is running: `npm run dev`
2. Check BASE_URL in config matches server
3. Verify port 3000 is available

### Issue: Authentication tests fail

**Solution:**
1. Create test users in database
2. Update credentials in test files
3. Check session cookie handling

### Issue: k6 not found

**Solution:**
1. Install k6: `choco install k6` (Windows)
2. Verify: `k6 version`
3. Add to PATH if needed

### Issue: Browser installation fails

**Solution:**
```bash
npx playwright install --force
```

---

## 🔄 CI/CD Integration

### GitHub Actions

See `tests/README.md` for GitHub Actions example.

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
npm run test:api
```

---

## 📊 Test Reports

### HTML Report

```bash
npx playwright show-report
```

Opens interactive HTML report with:
- Test results
- Screenshots on failure
- Videos on failure
- Timeline view

### JSON Report

```bash
# Results saved to: test-results/results.json
```

### Load Test Report

```bash
# Results saved to: test-results/load-summary.json
```

---

## ✅ Success Criteria

Testing infrastructure is ready when:

- ✅ `npm run test` executes all tests
- ✅ UI tests pass (or skip gracefully)
- ✅ API tests pass (or skip gracefully)
- ✅ Load tests run without errors
- ✅ Reports generate successfully
- ✅ CI/CD integration works

---

## 🎉 Next Steps

1. **Run initial test suite**: `npm run test`
2. **Review failures**: Fix or update test expectations
3. **Add test data**: Create test users/restaurants
4. **Integrate CI/CD**: Add to GitHub Actions
5. **Monitor performance**: Run load tests regularly

---

**Setup Status**: ✅ Complete  
**Test Files Created**: 7  
**Ready for**: Production Testing
