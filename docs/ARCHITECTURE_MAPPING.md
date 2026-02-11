# Architecture Module Mapping (M01–M05)

This document maps the homepage architecture claims to real database schemas and application logic.

## M01: District Governance

| Claim | Implementation |
|-------|----------------|
| Multi-tenant hierarchy | `District` model (Prisma) |
| Districts own restaurants | `Restaurant.districtId` → `District.id` |
| Database-scoped queries | `prisma.district.findFirst({ where: { adminId } })` |
| Isolation | `getUserDistrict(userId)` returns only the user's district |

**Schema:** `District` (id, adminId, name, code, subscriptionStatus, isActive)

---

## M02: Restaurant Scope Isolation

| Claim | Implementation |
|-------|----------------|
| Menus, orders, billing scoped to restaurant | `Order.restaurantId`, `Category.restaurantId`, `Bill.restaurantId` |
| No cross-tenant leakage | All queries filter by `restaurant: { districtId }` or `restaurantId` |
| Partner scope | `Partner.districtId`; Commission via `partner.districtId` |

**Schema:** `Order`, `Category`, `MenuItem`, `Bill`, `Commission` — all scoped via `restaurant` or `partner` relation to `districtId`.

**District dashboard:** `prisma.order.count({ where: { restaurant: { districtId } } })`, `prisma.commission.aggregate({ where: { partner: { districtId } } })`

---

## M03: Role Hierarchy

| Claim | Implementation |
|-------|----------------|
| SUPER_ADMIN → DISTRICT_ADMIN → RESTAURANT_OWNER | `User.role` enum |
| RBAC at API layer | `requireRole()`, `applyScope()`, `requireDistrictAdmin()` |
| RBAC at UI layer | Layout guards, role-based nav |

**Schema:** `User.role`, `User.districtId`, `User.restaurantId`

---

## M04: Stripe Connect Ledger

| Claim | Implementation |
|-------|----------------|
| Invoice-based idempotency | `RevenueShare.@@unique([districtId, invoiceId])` |
| Transfer verification before marking paid | `revenue-share.ts` transfer flow; `mark-paid` API |
| No manual override | Ledger updates only via verified Stripe webhooks |

**Schema:** `RevenueShare` (districtId, invoiceId, amountCents, commissionCents, payoutStatus)

---

## M05: Fail-closed Proxy Enforcement

| Claim | Implementation |
|-------|----------------|
| Subscription validation | `District.subscriptionStatus === 'ACTIVE'`; `District.isActive` |
| Domain verification | `District.isDomainVerified`, `getDistrictIdFromHost()` |
| Webhook signatures | Stripe webhook signature verification |
| Unverified payload rejected | Dashboard shows restricted state when subscription inactive |

**Implementation:** ` DistrictRestrictedState` when `!isActive || subscriptionStatus !== 'ACTIVE'`; revenue/order data not loaded.
