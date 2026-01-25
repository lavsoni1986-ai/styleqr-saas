# Visual Regression Testing

AI-powered visual regression testing using Playwright + Percy.

## Overview

Visual regression tests capture screenshots of UI components and pages, then compare them against baseline images. Any visual changes (layout shifts, CSS changes, component updates) are automatically detected.

## Setup

### 1. Install Dependencies

```bash
npm install -D @percy/cli @percy/playwright
```

### 2. Get Percy Token

1. Sign up at https://percy.io
2. Create a project: "styleqr-saas"
3. Get your Percy token from project settings
4. Set environment variable:

```bash
# Windows PowerShell
$env:PERCY_TOKEN="your-percy-token-here"

# Linux/Mac
export PERCY_TOKEN="your-percy-token-here"
```

### 3. Run Visual Tests

```bash
# Local development
npm run test:visual

# With Percy (requires token)
PERCY_TOKEN=your-token npm run test:visual
```

## Test Files

- `ui-regression.spec.ts` - Main visual regression test suite

## What Gets Tested

### Public Pages
- Home page
- Login page
- Signup page
- Menu page (public)
- 403 Forbidden page

### Responsive Views
- Mobile (375px)
- Tablet (768px)
- Desktop (1280px, 1920px)

### Authenticated Pages
- Dashboard
- Menu management
- QR generator

### Component States
- Empty states
- Filled states
- Loading states

### Admin Pages
- Admin dashboard

## Configuration

See `.percy.yml` for:
- Snapshot widths
- CSS overrides
- Network settings
- CI/CD integration

## CI/CD Integration

### GitHub Actions

```yaml
- name: Visual Tests
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
  run: npm run test:visual
```

## Best Practices

1. **Consistent Viewports**: Tests use fixed viewport sizes
2. **Wait for Stability**: Tests wait for network idle and animations
3. **Read-Only**: Tests don't modify database or state
4. **Deterministic**: Tests produce consistent results
5. **Isolated**: Visual tests don't affect other tests

## Troubleshooting

### Tests Skip

If tests skip, it usually means:
- Login form not found (test user doesn't exist)
- Page not accessible
- Element not visible

**Solution**: Create test users or update test expectations.

### Snapshots Don't Match

If Percy detects visual diffs:
1. Review diff in Percy dashboard
2. Determine if change is intentional
3. Approve if intentional, fix if regression

### Percy Token Missing

**Error**: `PERCY_TOKEN environment variable is required`

**Solution**: Set PERCY_TOKEN environment variable or use Percy CLI login.

## Resources

- [Percy Documentation](https://docs.percy.io)
- [Playwright Visual Testing](https://playwright.dev/docs/test-screenshots)
- [Percy + Playwright](https://docs.percy.io/docs/playwright)
