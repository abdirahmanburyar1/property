-- Run this SQL directly in PostgreSQL to fix the Country column issue immediately
-- Connect to your database and run these commands:

-- Make Country and PostalCode nullable
ALTER TABLE "Properties" ALTER COLUMN "Country" DROP NOT NULL;
ALTER TABLE "Properties" ALTER COLUMN "PostalCode" DROP NOT NULL;

-- Add RegionId and CityId columns if they don't exist (for the new foreign keys)
-- These will be added automatically by SchemaUpdate, but you can add them manually if needed:
-- ALTER TABLE "Properties" ADD COLUMN IF NOT EXISTS "RegionId" uuid;
-- ALTER TABLE "Properties" ADD COLUMN IF NOT EXISTS "CityId" uuid;

-- Verify the changes
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'Properties' 
AND column_name IN ('Country', 'PostalCode', 'RegionId', 'CityId');
