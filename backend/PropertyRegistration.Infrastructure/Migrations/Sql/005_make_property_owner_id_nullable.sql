-- Migration: Make Property OwnerId nullable
-- Description: Property can be under owner OR responsible person (alternative); OwnerId and ResponsiblePersonId are optional but at least one required by app logic.

ALTER TABLE "Properties" ALTER COLUMN "OwnerId" DROP NOT NULL;
