-- Quick fix: Make Country and PostalCode columns nullable in Properties table
-- Run this SQL directly in your PostgreSQL database if you need an immediate fix

ALTER TABLE "Properties" ALTER COLUMN "Country" DROP NOT NULL;
ALTER TABLE "Properties" ALTER COLUMN "PostalCode" DROP NOT NULL;
