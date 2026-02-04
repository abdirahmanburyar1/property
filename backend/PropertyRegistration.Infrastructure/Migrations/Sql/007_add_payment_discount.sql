-- Migration: Add Discount and Exemption fields to Payments table
-- Description: Add DiscountAmount, DiscountReason, IsExempt, ExemptionReason

-- Discount fields
ALTER TABLE "Payments"
ADD COLUMN IF NOT EXISTS "DiscountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "Payments"
ADD COLUMN IF NOT EXISTS "DiscountReason" VARCHAR(500);

-- Exemption fields
ALTER TABLE "Payments"
ADD COLUMN IF NOT EXISTS "IsExempt" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Payments"
ADD COLUMN IF NOT EXISTS "ExemptionReason" VARCHAR(500);

CREATE INDEX IF NOT EXISTS "IX_Payments_IsExempt" ON "Payments" ("IsExempt");
