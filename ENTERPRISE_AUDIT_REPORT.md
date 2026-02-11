# StyleQR SaaS — Enterprise Technical Due Diligence Audit

**Date:** 2026-02-10  
**Scope:** Full codebase — architecture, security, financial integrity, performance, observability, deployment, business readiness  
**Assumption:** Real money, real customers, fundable SaaS

---

## 1. OVERALL GRADE: **B-**

---

## 2. SAFE FOR

| Scenario | Safe? | Notes |
|----------|-------|------|
| **Local launch** | ✅ YES | Can run locally; test mode, Stripe test keys |
| **Real paying customers** | ⚠️ CONDITIONAL | Only after fixing Top 5 CRITICAL blockers |
| **1,000 users** | ⚠️ CONDITIONAL | Add rate limiting, fix tenant isolation |
| **10,000 users** | ❌ NO | Single-instance rate limit, DB scaling, no horizontal scaling |

---

## 3. TOP 5 CRITICAL BLOCKERS

### 1. **buildTenantWhere + Order.districtId mismatch — Prisma crash / data leak** [CRITICAL]
- **Location:** `src/lib/rbac-helpers.ts`, `src/app/api/admin/orders/route.ts`
- **Issue:** `buildTenantWhere(authUser, {}, hostDistrictId)` returns `{ restaurantId, districtId }`. `Order` has no `districtId` (only `restaurantId`). When RESTAURANT_ADMIN accesses via district custom domain, `prisma.order.findMany({ where: { restaurantId, districtId } })` passes an invalid field.
- **Impact:** Prisma error or undefined behavior; possible cross-district data exposure if `districtId` is ignored.
- **Fix:** Use `{ restaurant: { districtId: hostDistrictId } }` for Order, or stop passing `hostDistrictId` for Order and rely on `restaurantId` + `applyHostScope`.

### 2. **mark-paid payout route — no idempotency or Stripe verification** [CRITICAL]
- **Location:** `src/app/api/platform/payout/mark-paid/route.ts`
- **Issue:** SUPER_ADMIN can mark any RevenueShare as PAID without checking:
  - Whether Stripe transfer actually occurred
  - Idempotency under concurrent requests
  - No `stripeTransferId` validation
- **Impact:** Marking payouts as paid without real transfers; duplicate manual marks; audit trail inconsistency.
- **Fix:** Require `stripeTransferId` or external proof; use optimistic locking / `update` with `where: { id, payoutStatus: "PENDING" }`; add idempotency key.

### 3. **Subscription check fail-open in production** [CRITICAL]
- **Location:** `src/lib/subscription.server.ts` lines 145–154
- **Issue:** `checkRestaurantSubscription` catches errors and returns `isValid: true` with message "Subscription check failed - allowing access".
- **Impact:** DB or logic errors can grant access to paying features without a valid subscription.
- **Fix:** Make production fail-closed: return `isValid: false` when an error occurs.

### 4. **Rate limiting not applied to any API** [CRITICAL]
- **Location:** `src/lib/rate-limit.ts` — never used in API routes
- **Issue:** `checkRateLimit` and `withRateLimit` exist but are not wired to login, auth, payments, or admin APIs.
- **Impact:** Brute-force login, credential stuffing, DoS, payment abuse.
- **Fix:** Apply rate limits to `/api/auth/login`, `/api/auth/signup`, `/api/payments/*`, and other sensitive endpoints.

### 5. **Proxy fail-open on district check** [CRITICAL]
- **Location:** `src/proxy.ts` lines 128–133
- **Issue:** On district/DB check failure: "If district check fails, log but don't block (fail open for resilience)".
- **Impact:** When DB is unavailable, unverified or wrong districts can be served; subscription checks can be bypassed.
- **Fix:** Fail-closed for critical paths (e.g. return 503 or block non-platform domains when DB is unreachable).

---

## 4. TOP 5 HIGH RISK ITEMS

### 1. **RESTAURANT_OWNER vs RESTAURANT_ADMIN role mismatch** [HIGH]
- **Location:** `src/proxy.ts` lines 246, 337
- **Issue:** Proxy checks `session.role !== "RESTAURANT_OWNER"` for `/dashboard` and `/api/admin`, but signup creates `RESTAURANT_OWNER` and admin APIs use `RESTAURANT_ADMIN`.
- **Impact:** Users with RESTAURANT_ADMIN may be blocked from dashboard; RESTAURANT_OWNER may be blocked from admin APIs.
- **Fix:** Standardize roles; allow both where appropriate, or document and enforce a clear role model.

### 2. **Duplicate `return district` in getDistrictFromHost** [HIGH]
- **Location:** `src/lib/get-district-from-host.ts` lines 86–88
- **Issue:** Duplicate `return district`; unreachable code and possible confusion.
- **Fix:** Remove duplicate return.

### 3. **Auth/login — no rate limiting** [HIGH]
- **Location:** `src/app/api/auth/login/route.ts`
- **Issue:** Login endpoint has no rate limiting.
- **Impact:** Brute-force attacks on credentials.
- **Fix:** Apply rate limiting (e.g. via `rate-limit.ts`).

### 4. **Health endpoint — Stripe and DB calls on every request** [HIGH]
- **Location:** `src/app/api/internal/health/route.ts`
- **Issue:** Each request does `prisma.$queryRaw`, `stripe.balance.retrieve()`, `revenueShare.count`, `revenueShare.findFirst`. Under load this can be expensive.
- **Impact:** High latency; Stripe rate limits; DB load.
- **Fix:** Add caching (e.g. 10–30s) or split into a lightweight “ping” endpoint.

### 5. **RevenueShare ledger — race between check and create** [HIGH]
- **Location:** `src/lib/revenue-share.ts` lines 88–98, 160–172
- **Issue:** Idempotency uses `findUnique` then `create`. Under concurrency, two webhook deliveries can both pass the check and both attempt create; one will fail on unique constraint.
- **Impact:** One request fails with P2002; might trigger financial alerts; retries possible.
- **Fix:** Use `create` with `districtId_invoiceId` and handle P2002 as idempotent success, or use a transaction with `SELECT ... FOR UPDATE`.

---

## 5. WHAT MUST BE FIXED BEFORE ONBOARDING REAL USERS

1. **Tenant isolation:** Fix `buildTenantWhere` for Order (and any other models without `districtId`).
2. **Payout safety:** Add idempotency and Stripe verification to mark-paid.
3. **Subscription check:** Make production fail-closed when subscription check errors.
4. **Rate limiting:** Apply to auth and payment endpoints.
5. **Proxy resilience:** Fail-closed when district/DB check fails.
6. **Role consistency:** Align RESTAURANT_OWNER vs RESTAURANT_ADMIN across proxy and APIs.
7. **get-district-from-host:** Remove duplicate return.

---

## 6. WHAT CAN WAIT

- Feature-gate enforcement (feature-gate.ts is defined but not used everywhere).
- Health endpoint caching (optimization).
- Redis-backed rate limiting (current in-memory store is fine for single instance).
- Duplicate-LEDGER alert behavior (alert is correct; improve idempotency for cleaner handling).
- Commission `Float` vs cents (Commission uses Float; RevenueShare uses cents — acceptable for now).

---

## 7. SCALABILITY CEILING ESTIMATE

| Component | Current | Ceiling | Notes |
|-----------|---------|---------|-------|
| **Concurrent users** | ~100–300 (load tests) | ~500–1,000 | Single Node process |
| **Rate limit store** | In-memory Map | Single instance | Needs Redis for multi-instance |
| **DB connections** | Prisma default | ~20–50 | Connection pool limits |
| **Stripe webhooks** | Sequential per request | Adequate | Stripe retries |
| **Health endpoint** | No cache | Degrades under load | Needs caching |

**Estimated ceiling:** ~500–1,000 concurrent users on a single instance. For 10,000 users, need horizontal scaling, Redis, and DB optimization.

---

## 8. FUNDABILITY SCORE: **6.5/10**

**Strengths:**
- Stripe webhook security (signature verification)
- RevenueShare ledger (idempotency, cents)
- RBAC and host-based district isolation
- Financial alerting
- JWT freshness for role changes
- Prisma (no raw SQL injection)
- Sentry and structured logging

**Weaknesses:**
- Critical tenant isolation bug
- Payout marking without verification
- No rate limiting on auth/payments
- Fail-open on subscription and district checks
- Role mismatch (RESTAURANT_OWNER vs RESTAURANT_ADMIN)
- Single-instance design

---

## DETAILED FINDINGS BY AREA

### 1. ARCHITECTURE & SYSTEM DESIGN

| Finding | Severity | Notes |
|---------|----------|------|
| buildTenantWhere districtId for Order | CRITICAL | Order has no districtId; wrong filter shape |
| applyHostScope / getDistrictIdFromHost | Good | Host-based isolation used consistently |
| RBAC flow | Good | apiGuard + applyHostScope + buildTenantWhere |
| App Router structure | Good | Route handlers, layouts, server components |
| Duplicate return in getDistrictFromHost | HIGH | Unreachable code |

### 2. SECURITY AUDIT

| Finding | Severity |
|---------|----------|
| Auth: NextAuth only, credential flow | OK |
| Stripe webhook: signature verification | OK |
| Rate limiting not applied | CRITICAL |
| Login brute-force exposure | HIGH |
| X-Forwarded-For for rate limit key | MEDIUM (spoofable) |
| Subscription fail-open | CRITICAL |
| Proxy fail-open on district check | CRITICAL |
| mark-paid bypass | CRITICAL |
| No raw SQL / Prisma parameterized | OK |
| Cookie/session: NextAuth defaults | OK |

### 3. FINANCIAL INTEGRITY AUDIT

| Finding | Severity |
|---------|----------|
| RevenueShare: districtId + invoiceId unique | OK |
| RevenueShare: integer cents | OK |
| commissionCents <= amountCents | OK |
| Stripe transfer idempotency key | OK |
| mark-paid no Stripe verification | CRITICAL |
| mark-paid no optimistic locking | HIGH |
| Commission Float rounding | MEDIUM |
| Duplicate invoice handling | OK (idempotent) |

### 4. PERFORMANCE & SCALE

| Finding | Severity |
|---------|----------|
| Health: Stripe + DB + aggregates per request | HIGH |
| Order query: limit 100 | OK |
| Unbounded list endpoints | MEDIUM (some have limits) |
| N+1 patterns | OK (aggregates used) |
| Index coverage | OK (schema has indexes) |

### 5. OBSERVABILITY

| Finding | Severity |
|---------|----------|
| Financial alerts | OK |
| Sentry integration | OK |
| Request tracing (X-Request-ID) | OK |
| Logger coverage | OK |
| Webhook error visibility | OK |

### 6. DEPLOYMENT & PRODUCTION SAFETY

| Finding | Severity |
|---------|----------|
| SKIP_ENV_VALIDATION for build | OK (documented) |
| Env validation | OK |
| Test mode: NODE_ENV check | OK |
| Migration safety | OK |
| Stripe placeholder in build | MEDIUM (ensure prod keys) |

### 7. BUSINESS READINESS

| Finding | Severity |
|---------|----------|
| Plan gating (feature-gate) | MEDIUM (not fully enforced) |
| Subscription check fail-open | CRITICAL |
| Upgrade/downgrade flows | OK |
| Abuse vectors (rate limit) | CRITICAL |

---

## RECOMMENDATIONS

1. Fix the 5 CRITICAL blockers before any production launch.
2. Add rate limiting to auth and payment endpoints.
3. Make subscription and district checks fail-closed in production.
4. Harden mark-paid with Stripe verification and idempotency.
5. Fix Order tenant filtering (district via restaurant relation).
6. Unify RESTAURANT_OWNER and RESTAURANT_ADMIN handling.
7. Add health endpoint caching or a lightweight ping.
8. Plan Redis for rate limiting if moving to multiple instances.

---

*Audit conducted without modifying business logic, security controls, or observability.*
