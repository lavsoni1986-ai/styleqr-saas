/*
  Warnings:

  - A unique constraint covering the columns `[customDomain]` on the table `District` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `District` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `District` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cfOrderId]` on the table `District` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[verificationToken]` on the table `District` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cfVendorId]` on the table `Reseller` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cfTransferId]` on the table `RevenueShare` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cfPaymentId]` on the table `WebhookAuditLog` will be added. If there are existing duplicate values, this will fail.
  - Made the column `subscriptionStatus` on table `District` required. This step will fail if there are existing NULL values in that column.
  - Made the column `planType` on table `District` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "District" ALTER COLUMN "subscriptionStatus" SET NOT NULL,
ALTER COLUMN "planType" SET NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "contextNodeId" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'RESTAURANT_ADMIN';

-- CreateTable
CREATE TABLE "ContextNode" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "spaceType" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "timeSlot" TEXT,
    "serviceMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContextNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContextNode_entityType_spaceType_identifier_idx" ON "ContextNode"("entityType", "spaceType", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "ContextNode_entityType_spaceType_identifier_timeSlot_servic_key" ON "ContextNode"("entityType", "spaceType", "identifier", "timeSlot", "serviceMode");

-- CreateIndex
CREATE INDEX "ChurnSignal_districtId_idx" ON "ChurnSignal"("districtId");

-- CreateIndex
CREATE INDEX "ChurnSignal_riskLevel_idx" ON "ChurnSignal"("riskLevel");

-- CreateIndex
CREATE INDEX "ChurnSignal_createdAt_idx" ON "ChurnSignal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "District_customDomain_key" ON "District"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "District_stripeCustomerId_key" ON "District"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "District_stripeSubscriptionId_key" ON "District"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "District_verificationToken_key" ON "District"("verificationToken");

-- CreateIndex
CREATE INDEX "District_customDomain_idx" ON "District"("customDomain");

-- CreateIndex
CREATE INDEX "District_isActive_idx" ON "District"("isActive");

-- CreateIndex
CREATE INDEX "District_stripeCustomerId_idx" ON "District"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "District_stripeSubscriptionId_idx" ON "District"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "District_subscriptionStatus_idx" ON "District"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "District_isDomainVerified_idx" ON "District"("isDomainVerified");

-- CreateIndex
CREATE INDEX "District_planType_idx" ON "District"("planType");

-- CreateIndex
CREATE INDEX "District_resellerId_idx" ON "District"("resellerId");

-- CreateIndex
CREATE INDEX "Order_contextNodeId_idx" ON "Order"("contextNodeId");

-- CreateIndex
CREATE INDEX "Order_restaurantId_status_createdAt_idx" ON "Order"("restaurantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reseller_cfVendorId_key" ON "Reseller"("cfVendorId");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueShare_cfTransferId_key" ON "RevenueShare"("cfTransferId");

-- CreateIndex
CREATE INDEX "RevenueShare_stripeTransferId_idx" ON "RevenueShare"("stripeTransferId");

-- CreateIndex
CREATE INDEX "UpgradeIntent_districtId_idx" ON "UpgradeIntent"("districtId");

-- CreateIndex
CREATE INDEX "UpgradeIntent_planType_idx" ON "UpgradeIntent"("planType");

-- CreateIndex
CREATE INDEX "UpgradeIntent_createdAt_idx" ON "UpgradeIntent"("createdAt");

-- CreateIndex
CREATE INDEX "User_restaurantId_idx" ON "User"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookAuditLog_cfPaymentId_key" ON "WebhookAuditLog"("cfPaymentId");

-- CreateIndex
CREATE INDEX "WebhookAuditLog_cfPaymentId_idx" ON "WebhookAuditLog"("cfPaymentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_contextNodeId_fkey" FOREIGN KEY ("contextNodeId") REFERENCES "ContextNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurnSignal" ADD CONSTRAINT "ChurnSignal_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeIntent" ADD CONSTRAINT "UpgradeIntent_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;
