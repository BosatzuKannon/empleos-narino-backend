/*
  Warnings:

  - You are about to drop the column `amount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `wompiId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `wompiReference` on the `Transaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reference]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wompiTransactionId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amountInCents` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ServicePaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- DropIndex
DROP INDEX "Transaction_serviceId_key";

-- DropIndex
DROP INDEX "Transaction_wompiId_key";

-- DropIndex
DROP INDEX "Transaction_wompiReference_key";

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentStatus" "ServicePaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "amount",
DROP COLUMN "wompiId",
DROP COLUMN "wompiReference",
ADD COLUMN     "amountInCents" INTEGER NOT NULL,
ADD COLUMN     "reference" TEXT NOT NULL,
ADD COLUMN     "wompiTransactionId" TEXT,
ALTER COLUMN "type" SET DEFAULT 'PAY_PER_POST';

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_wompiTransactionId_key" ON "Transaction"("wompiTransactionId");
