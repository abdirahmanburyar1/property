-- Migration: Add "Partially Paid" payment status for payments that are partially collected
-- Run only if the status does not exist

INSERT INTO "PaymentStatuses" ("Id", "Name", "Description", "ColorCode", "IsActive", "DisplayOrder", "CreatedAt", "UpdatedAt")
SELECT gen_random_uuid(), 'Partially Paid', 'Payment partially collected', '#2196F3', true, 2, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PaymentStatuses" WHERE "Name" = 'Partially Paid');
