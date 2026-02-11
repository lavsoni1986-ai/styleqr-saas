-- Add unique constraint on District.cfOrderId
CREATE UNIQUE INDEX IF NOT EXISTS "District_cfOrderId_key" ON "District"("cfOrderId") WHERE "cfOrderId" IS NOT NULL;

-- Add unique constraint on Reseller.cfVendorId
CREATE UNIQUE INDEX IF NOT EXISTS "Reseller_cfVendorId_key" ON "Reseller"("cfVendorId") WHERE "cfVendorId" IS NOT NULL;
