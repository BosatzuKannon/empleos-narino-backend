-- Free publishing pivot: neutralize paymentStatus without dropping it.
-- New rows default to APPROVED and every historical unpaid row is published.

ALTER TABLE "JobVacancy" ALTER COLUMN "paymentStatus" SET DEFAULT 'APPROVED';
ALTER TABLE "Service" ALTER COLUMN "paymentStatus" SET DEFAULT 'APPROVED';

UPDATE "JobVacancy"
SET "status" = 'ACTIVE', "paymentStatus" = 'APPROVED'
WHERE "status" = 'PENDING_PAYMENT';

UPDATE "Service"
SET "paymentStatus" = 'APPROVED'
WHERE "paymentStatus" <> 'APPROVED';
