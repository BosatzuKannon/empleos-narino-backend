/*
  Warnings:

  - You are about to drop the column `jobId` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_jobId_fkey";

-- AlterTable
ALTER TABLE "JobVacancy" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentStatus" "ServicePaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "jobId",
ADD COLUMN     "offerId" UUID;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "JobVacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
