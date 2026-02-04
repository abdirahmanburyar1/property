-- Migration: Add Payment Tracking Columns to Property
-- Description: Adds PaidAmount and PaymentStatus columns to track property payment status
-- Date: 2026-01-24

-- Add PaidAmount column to Properties table
ALTER TABLE "Properties" 
ADD COLUMN "PaidAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- Add PaymentStatus column to Properties table
ALTER TABLE "Properties" 
ADD COLUMN "PaymentStatus" VARCHAR(50) NOT NULL DEFAULT 'Pending';

-- Add check constraint for PaymentStatus values
ALTER TABLE "Properties"
ADD CONSTRAINT "CHK_Properties_PaymentStatus" 
CHECK ("PaymentStatus" IN ('Pending', 'Paid', 'Paid_partially', 'Exemption'));

-- Add index for PaymentStatus for faster filtering
CREATE INDEX "IX_Properties_PaymentStatus" ON "Properties" ("PaymentStatus");

-- Add comment to document the columns
COMMENT ON COLUMN "Properties"."PaidAmount" IS 'Total amount paid for this property';
COMMENT ON COLUMN "Properties"."PaymentStatus" IS 'Payment status: Pending, Paid, Paid_partially, or Exemption';

-- Migration metadata
INSERT INTO "MigrationHistory" ("MigrationId", "MigrationName", "AppliedDate")
VALUES ('009', 'AddPaymentTrackingToProperty', NOW())
ON CONFLICT DO NOTHING;
