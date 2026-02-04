-- Migration: Allow PropertyTypes.Price to store 3 decimal places (e.g. 0.034, 0.042)
-- Date: 2026-02-04
-- Description: Change Price from NUMERIC(18,2) to NUMERIC(18,3) for permit pricing

ALTER TABLE "PropertyTypes"
ALTER COLUMN "Price" TYPE NUMERIC(18,3);
