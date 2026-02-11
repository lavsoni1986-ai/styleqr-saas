-- Financial Hardening Migration
-- Adds Reseller, RevenueShare (idempotent ledger with cents), enums, District columns
-- Safe for: migrate reset, migrate deploy

-- CreateEnum (if not exists - harmless if exists)
DO $$ BEGIN
  CREATE TYPE "DistrictSubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlanType" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add RESTAURANT_ADMIN to Role if missing
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'RESTAURANT_ADMIN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Alter District: add columns for subscriptions, domain, reseller
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "customDomain" TEXT;
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "DistrictSubscriptionStatus" DEFAULT 'INACTIVE';
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "planType" "PlanType" DEFAULT 'BASIC';
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "isDomainVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "verificationCheckedAt" TIMESTAMP(3);
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "resellerId" TEXT;

-- Add User.restaurantId if missing
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "restaurantId" TEXT;

-- Create Reseller table
CREATE TABLE IF NOT EXISTS "Reseller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "stripeAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reseller_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Reseller_email_key" ON "Reseller"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Reseller_stripeAccountId_key" ON "Reseller"("stripeAccountId");
CREATE INDEX IF NOT EXISTS "Reseller_email_idx" ON "Reseller"("email");
CREATE INDEX IF NOT EXISTS "Reseller_stripeAccountId_idx" ON "Reseller"("stripeAccountId");

-- Add District FK to Reseller
DO $$ BEGIN
  ALTER TABLE "District" ADD CONSTRAINT "District_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop old RevenueShare if exists (schema change from float to cents)
DROP TABLE IF EXISTS "RevenueShare";

-- Create RevenueShare with idempotent ledger (cents, invoiceId, unique constraint)
CREATE TABLE "RevenueShare" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "payoutStatus" TEXT NOT NULL,
    "stripeTransferId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueShare_districtId_invoiceId_key" ON "RevenueShare"("districtId", "invoiceId");
CREATE UNIQUE INDEX "RevenueShare_stripeTransferId_key" ON "RevenueShare"("stripeTransferId");
CREATE INDEX "RevenueShare_resellerId_idx" ON "RevenueShare"("resellerId");
CREATE INDEX "RevenueShare_districtId_idx" ON "RevenueShare"("districtId");
CREATE INDEX "RevenueShare_payoutStatus_idx" ON "RevenueShare"("payoutStatus");
CREATE INDEX "RevenueShare_createdAt_idx" ON "RevenueShare"("createdAt");
CREATE INDEX "RevenueShare_invoiceId_idx" ON "RevenueShare"("invoiceId");

ALTER TABLE "RevenueShare" ADD CONSTRAINT "RevenueShare_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueShare" ADD CONSTRAINT "RevenueShare_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create AuditLog if not exists
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "userId" TEXT,
    "userRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_districtId_idx" ON "AuditLog"("districtId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_idx" ON "AuditLog"("entityType");

DO $$ BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create ChurnSignal, UpgradeIntent if not exists (for schema completeness)
CREATE TABLE IF NOT EXISTS "ChurnSignal" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurnSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UpgradeIntent" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpgradeIntent_pkey" PRIMARY KEY ("id")
);
