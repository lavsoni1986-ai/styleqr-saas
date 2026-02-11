# Financial Hardening Test Scenarios

Manual validation checklist for revenue share and Stripe webhook flows.

## Prerequisites

- Database with migrations applied
- Stripe test mode keys configured
- At least one district with reseller assigned

## Scenarios to Validate

### 1. invoice.paid once → 1 RevenueShare record

- Trigger `invoice.paid` webhook for a district with reseller
- Verify: exactly 1 `RevenueShare` row with `districtId`, `invoiceId`, `amountCents`, `commissionCents`
- Check: `commissionCents <= amountCents`

### 2. Webhook retry → no duplicate

- Replay same `invoice.paid` event (same `invoice.id`)
- Verify: no new `RevenueShare` row created
- Verify: existing row unchanged
- Audit: `PAYOUT_SKIPPED_DUPLICATE` logged

### 3. Stripe transfer fail → payoutStatus = PENDING

- Simulate transfer failure (e.g. invalid Stripe Connect account)
- Verify: `RevenueShare` created with `payoutStatus = PENDING`
- Audit: `PAYOUT_TRANSFER_FAILED` or `PAYOUT_CREATED`

### 4. Retry payout → success

- Call `POST /api/platform/payout/retry` with `revenueShareId` of PENDING record
- Verify: Stripe transfer created, `payoutStatus` updated to PAID
- Audit: `PAYOUT_RETRY_SUCCESS`

### 5. Next month invoice → new ledger entry

- Trigger `invoice.paid` for a different invoice (recurring billing)
- Verify: new `RevenueShare` row with different `invoiceId`
- Verify: `districtId` + `invoiceId` unique constraint holds

### 6. Duplicate event replay → ignored

- Send same webhook payload twice
- Verify: second run creates no new row (idempotent)
- Ledger: `@@unique([districtId, invoiceId])` enforced

### 7. Negative or zero commission → rejected

- District with `commissionRate = 0` or negative
- Trigger `invoice.paid`
- Verify: no `RevenueShare` row created
- Verify: `commissionCents <= 0` rejected in `calculateAndStoreRevenueShare`

## Quick SQL Checks

```sql
-- Count RevenueShare per district+invoice (should be 1)
SELECT "districtId", "invoiceId", COUNT(*) 
FROM "RevenueShare" 
GROUP BY "districtId", "invoiceId" 
HAVING COUNT(*) > 1;

-- Verify cents integrity
SELECT id, "amountCents", "commissionCents" 
FROM "RevenueShare" 
WHERE "commissionCents" > "amountCents" OR "commissionCents" <= 0;
```
