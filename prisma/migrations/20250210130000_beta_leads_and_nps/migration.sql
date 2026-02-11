-- CreateEnum
CREATE TYPE "BetaLeadStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateTable
CREATE TABLE "BetaLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "restaurant" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "phone" TEXT,
    "monthlyOrders" INTEGER,
    "status" "BetaLeadStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "districtId" TEXT,
    "restaurantId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpsFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NpsFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BetaLead_email_key" ON "BetaLead"("email");

-- CreateIndex
CREATE INDEX "BetaLead_status_idx" ON "BetaLead"("status");

-- CreateIndex
CREATE INDEX "BetaLead_email_idx" ON "BetaLead"("email");

-- CreateIndex
CREATE INDEX "BetaLead_createdAt_idx" ON "BetaLead"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NpsFeedback_userId_key" ON "NpsFeedback"("userId");

-- CreateIndex
CREATE INDEX "NpsFeedback_userId_idx" ON "NpsFeedback"("userId");

-- CreateIndex
CREATE INDEX "NpsFeedback_createdAt_idx" ON "NpsFeedback"("createdAt");

-- AddForeignKey
ALTER TABLE "NpsFeedback" ADD CONSTRAINT "NpsFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
