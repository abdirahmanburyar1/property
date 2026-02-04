-- Migration: Seed Payment Methods
-- Description: Inserts default payment methods if they don't exist
-- Date: 2026-01-24

-- Insert default payment methods (only if they don't exist)
INSERT INTO "PaymentMethods" ("Id", "Name", "Code", "Description", "IsActive", "DisplayOrder", "CreatedAt", "UpdatedAt")
SELECT 
    gen_random_uuid(),
    'Mobile Money',
    'MOBILE_MONEY',
    'Payment via mobile money transfer (e.g., Zaad, EVC Plus)',
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "PaymentMethods" WHERE "Code" = 'MOBILE_MONEY'
);

INSERT INTO "PaymentMethods" ("Id", "Name", "Code", "Description", "IsActive", "DisplayOrder", "CreatedAt", "UpdatedAt")
SELECT 
    gen_random_uuid(),
    'Cash',
    'CASH',
    'Cash payment',
    true,
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "PaymentMethods" WHERE "Code" = 'CASH'
);

INSERT INTO "PaymentMethods" ("Id", "Name", "Code", "Description", "IsActive", "DisplayOrder", "CreatedAt", "UpdatedAt")
SELECT 
    gen_random_uuid(),
    'Bank Transfer',
    'BANK_TRANSFER',
    'Payment via bank transfer',
    true,
    3,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "PaymentMethods" WHERE "Code" = 'BANK_TRANSFER'
);

INSERT INTO "PaymentMethods" ("Id", "Name", "Code", "Description", "IsActive", "DisplayOrder", "CreatedAt", "UpdatedAt")
SELECT 
    gen_random_uuid(),
    'Check',
    'CHECK',
    'Payment via check',
    true,
    4,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "PaymentMethods" WHERE "Code" = 'CHECK'
);

INSERT INTO "PaymentMethods" ("Id", "Name", "Code", "Description", "IsActive", "DisplayOrder", "CreatedAt", "UpdatedAt")
SELECT 
    gen_random_uuid(),
    'Credit Card',
    'CREDIT_CARD',
    'Payment via credit card',
    true,
    5,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "PaymentMethods" WHERE "Code" = 'CREDIT_CARD'
);

-- Migration metadata
INSERT INTO "MigrationHistory" ("MigrationId", "MigrationName", "AppliedDate")
VALUES ('011', 'SeedPaymentMethods', NOW())
ON CONFLICT DO NOTHING;
