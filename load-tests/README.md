# Load Testing Framework

## Overview

Comprehensive load testing framework for StyleQR-SaaS using:
- **k6** - High-performance load testing
- **Artillery** - Flexible scenario testing
- **Autocannon** - Quick micro-benchmarks

## Test Suites

### k6 Tests

#### Restaurant API (`k6/restaurant-api.test.js`)
- Tests restaurant listing and creation
- Target: 100+ req/sec
- P95 latency: < 200ms

#### Menu API (`k6/menu-api.test.js`)
- Tests menu categories and items
- Target: 200+ req/sec
- P95 latency: < 200ms

#### Orders API (`k6/orders-api.test.js`)
- Tests order creation and listing
- Target: 100+ req/sec
- P95 latency: < 300ms
- Validates idempotency

#### Auth API (`k6/auth-api.test.js`)
- Tests login/logout
- Target: 50+ req/sec
- P95 latency: < 500ms

#### QR Burst (`k6/qr-burst.test.js`)
- Simulates 1000 QR scans/minute
- Burst traffic pattern
- Validates order creation from QR

#### Lunch Rush (`k6/lunch-rush.test.js`)
- Simulates 10x normal traffic
- Mixed workload
- Sustained high load

### Artillery Tests

#### Configuration (`artillery/artillery.config.yml`)
- Multi-scenario testing
- Weighted traffic distribution
- Endpoint-specific expectations

### Autocannon Benchmarks

#### Quick Benchmarks (`autocannon/benchmark.js`)
- Individual endpoint testing
- Micro-benchmarks
- Fast iteration

## Running Tests

### Prerequisites

```bash
# Install k6
# macOS: brew install k6
# Linux: https://k6.io/docs/getting-started/installation/
# Windows: https://k6.io/docs/getting-started/installation/

# Install Artillery
npm install -g artillery

# Install Autocannon
npm install -g autocannon
```

### k6 Tests

```bash
# Set environment variables
export BASE_URL="http://localhost:3000"
export AUTH_TOKEN="your-session-token"
export RESTAURANT_ID="restaurant-uuid"
export MENU_ITEM_IDS="item1-uuid,item2-uuid"

# Run specific test
k6 run load-tests/k6/restaurant-api.test.js

# Run with custom VUs
VUS=200 k6 run load-tests/k6/orders-api.test.js

# Run QR burst test
QR_TOKEN="qr-token" k6 run load-tests/k6/qr-burst.test.js
```

### Artillery Tests

```bash
# Run Artillery test
artillery run load-tests/artillery/artillery.config.yml

# Run with custom target
artillery run load-tests/artillery/artillery.config.yml --target http://staging.example.com
```

### Autocannon Benchmarks

```bash
# Run benchmarks
node load-tests/autocannon/benchmark.js

# Custom target
BASE_URL="http://localhost:3000" node load-tests/autocannon/benchmark.js
```

## Performance Targets

| Metric | Target |
|--------|--------|
| API P95 latency | < 250ms |
| Order creation latency | < 300ms |
| Dashboard API latency | < 200ms |
| Error rate | < 0.1% |
| Throughput | 500+ req/sec |
| DB query latency | < 50ms |

## Results

Test results are saved to `load-tests/results/` directory.

## Continuous Testing

Integrate into CI/CD pipeline:

```yaml
# .github/workflows/load-test.yml
- name: Run Load Tests
  run: |
    k6 run load-tests/k6/health-check.test.js
```

