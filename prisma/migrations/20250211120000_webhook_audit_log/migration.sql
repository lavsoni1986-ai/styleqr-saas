-- CreateTable
CREATE TABLE "WebhookAuditLog" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "districtId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookAuditLog_stripeEventId_key" ON "WebhookAuditLog"("stripeEventId");

-- CreateIndex
CREATE INDEX "WebhookAuditLog_stripeEventId_idx" ON "WebhookAuditLog"("stripeEventId");

-- CreateIndex
CREATE INDEX "WebhookAuditLog_status_idx" ON "WebhookAuditLog"("status");

-- CreateIndex
CREATE INDEX "WebhookAuditLog_createdAt_idx" ON "WebhookAuditLog"("createdAt");
