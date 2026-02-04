-- Migration: Add extra columns to Properties table
-- Date: 2026-01-21
-- Description: Add PlateNumber and KontontriyeId columns to Properties table
-- Note: Section and SubSection are now handled as foreign keys in migration 004

-- Add PlateNumber column (nullable string, max 50 characters)
ALTER TABLE "Properties" 
ADD COLUMN IF NOT EXISTS "PlateNumber" VARCHAR(50);

-- Add KontontriyeId column (nullable foreign key to Users table)
ALTER TABLE "Properties" 
ADD COLUMN IF NOT EXISTS "KontontriyeId" UUID;

-- Add index for KontontriyeId for better query performance
CREATE INDEX IF NOT EXISTS "IX_Properties_KontontriyeId" ON "Properties" ("KontontriyeId");

-- Add foreign key constraint to Users table
-- Note: This assumes the Users table exists and has an Id column of type UUID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'FK_Properties_KontontriyeId_Users_Id'
    ) THEN
        ALTER TABLE "Properties"
        ADD CONSTRAINT "FK_Properties_KontontriyeId_Users_Id"
        FOREIGN KEY ("KontontriyeId") 
        REFERENCES "Users"("Id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for PlateNumber for searching
CREATE INDEX IF NOT EXISTS "IX_Properties_PlateNumber" ON "Properties" ("PlateNumber");
