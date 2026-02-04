-- Migration: Add Height and Width to Properties table
-- Description: Height, width and areaSize are stored separately; values are stored as written.

ALTER TABLE "Properties" ADD COLUMN IF NOT EXISTS "Height" DECIMAL(12,2) NULL;
ALTER TABLE "Properties" ADD COLUMN IF NOT EXISTS "Width" DECIMAL(12,2) NULL;
