-- Cashfree migration: Add Cashfree fields, deprecate Stripe fields
-- WebhookAuditLog: Add cfPaymentId for Cashfree idempotency, make stripeEventId nullable
ALTER TABLE "WebhookAuditLog" ADD COLUMN IF NOT EXISTS "cfPaymentId" TEXT;
ALTER TABLE "WebhookAuditLog" ALTER COLUMN "stripeEventId" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookAuditLog_cfPaymentId_key" ON "WebhookAuditLog"("cfPaymentId") WHERE "cfPaymentId" IS NOT NULL;

-- RevenueShare: Add cfTransferId, keep stripeTransferId for backward compat during transition
ALTER TABLE "RevenueShare" ADD COLUMN IF NOT EXISTS "cfTransferId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "RevenueShare_cfTransferId_key" ON "RevenueShare"("cfTransferId") WHERE "cfTransferId" IS NOT NULL;

-- District: Add Cashfree fields
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "cfCustomerId" TEXT;
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "cfOrderId" TEXT;

-- Reseller: Add Cashfree vendor ID for payouts
ALTER TABLE "Reseller" ADD COLUMN IF NOT EXISTS "cfVendorId" TEXT;
