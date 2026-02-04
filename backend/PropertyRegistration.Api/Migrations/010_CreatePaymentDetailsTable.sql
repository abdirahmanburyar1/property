-- Migration: Create PaymentDetails Table
-- Description: Creates PaymentDetails table for tracking partial payments
-- Date: 2026-01-24

-- Create PaymentDetails table
CREATE TABLE "PaymentDetails" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "PropertyId" UUID NOT NULL,
    "PaymentId" UUID NULL,
    "CollectedBy" UUID NOT NULL,
    "PaymentMethodId" UUID NOT NULL,
    "Amount" DECIMAL(18, 2) NOT NULL,
    "Currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "PaymentDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "TransactionReference" VARCHAR(100) NOT NULL,
    "ReceiptNumber" VARCHAR(50) NULL,
    "Notes" TEXT NULL,
    "InstallmentNumber" INTEGER NOT NULL DEFAULT 1,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Foreign keys
    CONSTRAINT "FK_PaymentDetails_Property" FOREIGN KEY ("PropertyId") 
        REFERENCES "Properties"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_PaymentDetails_Payment" FOREIGN KEY ("PaymentId") 
        REFERENCES "Payments"("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_PaymentDetails_CollectedBy" FOREIGN KEY ("CollectedBy") 
        REFERENCES "Users"("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_PaymentDetails_PaymentMethod" FOREIGN KEY ("PaymentMethodId") 
        REFERENCES "PaymentMethods"("Id") ON DELETE RESTRICT,
        
    -- Check constraints
    CONSTRAINT "CHK_PaymentDetails_Amount" CHECK ("Amount" > 0),
    CONSTRAINT "CHK_PaymentDetails_InstallmentNumber" CHECK ("InstallmentNumber" > 0)
);

-- Create indexes
CREATE INDEX "IX_PaymentDetails_PropertyId" ON "PaymentDetails" ("PropertyId");
CREATE INDEX "IX_PaymentDetails_PaymentId" ON "PaymentDetails" ("PaymentId");
CREATE INDEX "IX_PaymentDetails_CollectedBy" ON "PaymentDetails" ("CollectedBy");
CREATE INDEX "IX_PaymentDetails_PaymentDate" ON "PaymentDetails" ("PaymentDate");
CREATE INDEX "IX_PaymentDetails_TransactionReference" ON "PaymentDetails" ("TransactionReference");

-- Add unique constraint on transaction reference
CREATE UNIQUE INDEX "UQ_PaymentDetails_TransactionReference" 
    ON "PaymentDetails" ("TransactionReference") 
    WHERE "IsDeleted" = FALSE;

-- Add comments
COMMENT ON TABLE "PaymentDetails" IS 'Tracks individual payment installments for properties with partial payments';
COMMENT ON COLUMN "PaymentDetails"."PropertyId" IS 'Property this payment is for';
COMMENT ON COLUMN "PaymentDetails"."PaymentId" IS 'Optional link to main Payment record';
COMMENT ON COLUMN "PaymentDetails"."CollectedBy" IS 'User who collected this payment';
COMMENT ON COLUMN "PaymentDetails"."Amount" IS 'Amount paid in this installment';
COMMENT ON COLUMN "PaymentDetails"."InstallmentNumber" IS 'Sequence number of this payment (1st, 2nd, 3rd, etc.)';
COMMENT ON COLUMN "PaymentDetails"."TransactionReference" IS 'Unique transaction reference for this payment';
COMMENT ON COLUMN "PaymentDetails"."ReceiptNumber" IS 'Receipt number issued for this payment';

-- Create trigger for UpdatedAt
CREATE OR REPLACE FUNCTION update_payment_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_payment_details_updated_at
    BEFORE UPDATE ON "PaymentDetails"
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_details_updated_at();

-- Migration metadata
INSERT INTO "MigrationHistory" ("MigrationId", "MigrationName", "AppliedDate")
VALUES ('010', 'CreatePaymentDetailsTable', NOW())
ON CONFLICT DO NOTHING;
