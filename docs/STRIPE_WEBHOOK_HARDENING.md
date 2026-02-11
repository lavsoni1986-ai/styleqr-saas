# Stripe Webhook & RevenueShare Hardening — Shahdol Pilot

## Summary of Changes

### 1. Idempotency (Duplicate Prevention)

**File:** `src/app/api/stripe/webhook/route.ts`

- **Before:** No event-level idempotency; relied on RevenueShare `districtId + invoiceId` for ledger only.
- **After:** Before processing, check `WebhookAuditLog` for `stripeEventId` (event.id). If found, return `200 OK` immediately.
- **Table:** `WebhookAuditLog` with unique `stripeEventId`.

### 2. Amount Integrity

**Files:** `src/lib/revenue-share.ts`, `src/app/api/stripe/webhook/route.ts`

- **Source:** `invoice.amount_paid` from Stripe `invoice.paid` event.
- **Flow:** Webhook passes `amountPaidCents` verbatim to `calculateAndStoreRevenueShare` → stored as `RevenueShare.amountCents`.
- **Validation:** No transformation; amount stored exactly as received from Stripe.

### 3. Transfer Tracking

**File:** `prisma/schema.prisma`, `src/lib/revenue-share.ts`, `src/app/api/platform/payout/retry/route.ts`

- **Field:** `RevenueShare.stripeTransferId` (`String?` with `@unique`).
- **Populated when:**
  - Auto-transfer succeeds in `calculateAndStoreRevenueShare`.
  - Retry succeeds in `/api/platform/payout/retry`.
- **Required for:** `mark-paid` endpoint to verify transfer via Stripe API before marking PAID.

### 4. Verification Hardening (mark-paid)

**File:** `src/app/api/platform/payout/mark-paid/route.ts` (unchanged)

- Rejects if `stripeTransferId` is missing.
- Calls `stripe.transfers.retrieve()` to verify transfer exists.
- Verifies amount, destination, and currency match the ledger.
- Uses optimistic locking (`updateMany` where `payoutStatus === "PENDING"`).

### 5. Fail-Closed Logging

**File:** `src/app/api/stripe/webhook/route.ts`

- **On success:** Upsert `WebhookAuditLog` with `status: "PROCESSED"`.
- **On failure:** Upsert `WebhookAuditLog` with `status: "FAILED"`, `errorMessage`, and metadata.
- If inserting the failure log fails (e.g. DB down), the error is still logged via `webhookLogger` and `triggerFinancialAlert`.

## Schema Changes

```prisma
model WebhookAuditLog {
  id             String   @id @default(cuid())
  stripeEventId  String   @unique
  eventType      String
  status         String   // PROCESSED | FAILED
  errorMessage   String?
  districtId     String?
  metadata       Json?
  createdAt      DateTime @default(now())

  @@index([stripeEventId])
  @@index([status])
  @@index([createdAt])
}
```

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `WebhookAuditLog` model |
| `prisma/migrations/20250211120000_webhook_audit_log/migration.sql` | Migration for new table |
| `src/app/api/stripe/webhook/route.ts` | Event idempotency, success/failure logging |
| `src/lib/revenue-share.ts` | Amount integrity docs, transfer tracking comment |

## Manual Re-Sync

To re-sync failed webhooks:

1. Query `WebhookAuditLog` where `status = 'FAILED'`.
2. Use `stripeEventId` to fetch the event from Stripe (`stripe.events.retrieve`).
3. Replay the event through your processing logic or Stripe Dashboard.
