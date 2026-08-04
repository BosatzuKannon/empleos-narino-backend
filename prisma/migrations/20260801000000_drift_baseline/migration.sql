-- Baseline for schema changes that were applied directly to the database
-- but were never recorded in migration history:
--   * ApplicationStatus: added variant CANCELED
--   * JobVacancy: added column availablePositions
--   * User: added column resume

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'CANCELED';

-- AlterTable
ALTER TABLE "JobVacancy" ADD COLUMN "availablePositions" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "resume" TEXT;
