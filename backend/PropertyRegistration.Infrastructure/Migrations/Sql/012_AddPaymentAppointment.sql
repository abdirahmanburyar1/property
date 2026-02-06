-- Migration: Add Payment Appointment fields
-- Description: Adds optional appointment date and notes for collector payment appointments
-- Date: 2026-02-06

ALTER TABLE "Payments"
  ADD COLUMN IF NOT EXISTS "AppointmentDate" TIMESTAMP NULL;

ALTER TABLE "Payments"
  ADD COLUMN IF NOT EXISTS "AppointmentNotes" VARCHAR(1000) NULL;

COMMENT ON COLUMN "Payments"."AppointmentDate" IS 'Optional appointment date/time for the collector to collect this payment';

COMMENT ON COLUMN "Payments"."AppointmentNotes" IS 'Optional notes for the payment appointment (e.g. preferred time, contact instructions)';
