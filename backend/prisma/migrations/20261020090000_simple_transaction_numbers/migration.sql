-- Database sequences allocate unique numbers across processes and transactions.
-- Numbers may have gaps after rollbacks; they are never recycled or reset yearly.
CREATE SEQUENCE "payment_reference_seq" START WITH 100001 NO CYCLE;
CREATE SEQUENCE "receipt_number_seq" START WITH 100001 NO CYCLE;

-- Preserve historical payments and immutable receipt snapshots. Only new payments
-- receive the system reference; external provider identities remain unchanged.
ALTER TABLE "Payment" ADD COLUMN "paymentReference" TEXT;
ALTER TABLE "Payment" ALTER COLUMN "paymentReference"
  SET DEFAULT ('P-' || nextval('payment_reference_seq')::text);
CREATE UNIQUE INDEX "Payment_paymentReference_key" ON "Payment"("paymentReference");

-- Start above any previously issued numeric receipt numbers as well.
SELECT setval('receipt_number_seq', GREATEST(100000,
  COALESCE((SELECT MAX(substring("receiptNumber" FROM 3)::bigint)
    FROM "Receipt" WHERE "receiptNumber" ~ '^R-[0-9]{1,18}$'), 0)));
ALTER TABLE "Receipt" ALTER COLUMN "receiptNumber"
  SET DEFAULT ('R-' || nextval('receipt_number_seq')::text);
