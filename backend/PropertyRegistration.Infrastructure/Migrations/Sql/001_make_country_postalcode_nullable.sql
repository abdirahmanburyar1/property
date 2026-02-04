-- Migration: Make Country and PostalCode columns nullable in Properties table
-- Date: 2026-01-21
-- Description: These columns were removed from the Property entity, so they should be nullable

-- Note: PostgreSQL stores unquoted identifiers in lowercase
ALTER TABLE properties ALTER COLUMN country DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN postalcode DROP NOT NULL;
