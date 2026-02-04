-- Migration: Add CollectorId and Exemption fields to Payments table
-- Date: 2026-01-21
-- Description: Add fields to track collector assignment and payment exemptions

-- Add CollectorId column (nullable foreign key to Users table)
ALTER TABLE "Payments" 
ADD COLUMN IF NOT EXISTS "CollectorId" UUID;

-- Add index for CollectorId for better query performance
CREATE INDEX IF NOT EXISTS "IX_Payments_CollectorId" ON "Payments" ("CollectorId");

-- Add foreign key constraint to Users table
-- Note: This assumes the Users table exists and has an Id column of type UUID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'FK_Payments_CollectorId_Users_Id'
    ) THEN
        ALTER TABLE "Payments"
        ADD CONSTRAINT "FK_Payments_CollectorId_Users_Id"
        FOREIGN KEY ("CollectorId") 
        REFERENCES "Users"("Id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add IsExempt column (boolean, default false)
ALTER TABLE "Payments" 
ADD COLUMN IF NOT EXISTS "IsExempt" BOOLEAN NOT NULL DEFAULT false;

-- Add ExemptionReason column (nullable text)
ALTER TABLE "Payments" 
ADD COLUMN IF NOT EXISTS "ExemptionReason" VARCHAR(500);

-- Add index for IsExempt for filtering exempted payments
CREATE INDEX IF NOT EXISTS "IX_Payments_IsExempt" ON "Payments" ("IsExempt");

-- Update existing payments to have IsExempt = false if NULL (safety check)
UPDATE "Payments" 
SET "IsExempt" = false 
WHERE "IsExempt" IS NULL;
