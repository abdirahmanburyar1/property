-- Migration: Add Sections and SubSections tables, make PlateNumber unique
-- Date: 2026-01-21
-- Description: Create Sections and SubSections tables, update Properties to use foreign keys, make PlateNumber unique

-- Create Sections table
CREATE TABLE IF NOT EXISTS "Sections" (
    "Id" UUID NOT NULL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Description" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMP NOT NULL,
    "UpdatedAt" TIMESTAMP NOT NULL
);

-- Create index for Sections
CREATE INDEX IF NOT EXISTS "IX_Sections_IsActive" ON "Sections" ("IsActive");
CREATE INDEX IF NOT EXISTS "IX_Sections_DisplayOrder" ON "Sections" ("DisplayOrder");

-- Create SubSections table
CREATE TABLE IF NOT EXISTS "SubSections" (
    "Id" UUID NOT NULL PRIMARY KEY,
    "SectionId" UUID NOT NULL,
    "Name" VARCHAR(100) NOT NULL,
    "Description" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMP NOT NULL,
    "UpdatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "FK_SubSections_SectionId_Sections_Id" 
        FOREIGN KEY ("SectionId") 
        REFERENCES "Sections"("Id") 
        ON DELETE CASCADE
);

-- Create indexes for SubSections
CREATE INDEX IF NOT EXISTS "IX_SubSections_SectionId" ON "SubSections" ("SectionId");
CREATE INDEX IF NOT EXISTS "IX_SubSections_IsActive" ON "SubSections" ("IsActive");
CREATE INDEX IF NOT EXISTS "IX_SubSections_DisplayOrder" ON "SubSections" ("DisplayOrder");

-- First, ensure PlateNumber column exists (from migration 003)
ALTER TABLE "Properties" 
ADD COLUMN IF NOT EXISTS "PlateNumber" VARCHAR(50);

-- Add SectionId and SubSectionId columns to Properties table (if they don't exist)
ALTER TABLE "Properties" 
ADD COLUMN IF NOT EXISTS "SectionId" UUID;

ALTER TABLE "Properties" 
ADD COLUMN IF NOT EXISTS "SubSectionId" UUID;

-- Add foreign key constraints for SectionId and SubSectionId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'FK_Properties_SectionId_Sections_Id'
    ) THEN
        ALTER TABLE "Properties"
        ADD CONSTRAINT "FK_Properties_SectionId_Sections_Id"
        FOREIGN KEY ("SectionId") 
        REFERENCES "Sections"("Id") 
        ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'FK_Properties_SubSectionId_SubSections_Id'
    ) THEN
        ALTER TABLE "Properties"
        ADD CONSTRAINT "FK_Properties_SubSectionId_SubSections_Id"
        FOREIGN KEY ("SubSectionId") 
        REFERENCES "SubSections"("Id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for SectionId and SubSectionId
CREATE INDEX IF NOT EXISTS "IX_Properties_SectionId" ON "Properties" ("SectionId");
CREATE INDEX IF NOT EXISTS "IX_Properties_SubSectionId" ON "Properties" ("SubSectionId");

-- Make PlateNumber unique (first, handle any existing duplicates by setting them to NULL)
-- Note: This will set duplicate PlateNumbers to NULL. You may want to handle duplicates differently.
UPDATE "Properties" 
SET "PlateNumber" = NULL 
WHERE "PlateNumber" IN (
    SELECT "PlateNumber" 
    FROM "Properties" 
    WHERE "PlateNumber" IS NOT NULL 
    GROUP BY "PlateNumber" 
    HAVING COUNT(*) > 1
);

-- Drop existing unique constraint if it exists (in case it was added manually)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'UQ_Properties_PlateNumber'
    ) THEN
        ALTER TABLE "Properties" DROP CONSTRAINT "UQ_Properties_PlateNumber";
    END IF;
END $$;

-- Add unique constraint on PlateNumber (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_Properties_PlateNumber" 
ON "Properties" ("PlateNumber") 
WHERE "PlateNumber" IS NOT NULL;

-- Remove old Section and SubSection string columns if they exist
-- (They should not exist if the migration was run correctly, but this is a safety check)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Properties' AND column_name = 'Section'
    ) THEN
        ALTER TABLE "Properties" DROP COLUMN "Section";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Properties' AND column_name = 'SubSection'
    ) THEN
        ALTER TABLE "Properties" DROP COLUMN "SubSection";
    END IF;
END $$;
