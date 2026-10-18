-- Allow email-only customers without changing existing contact or transactional history.
ALTER TABLE "Customer" ALTER COLUMN "phone" DROP NOT NULL;
