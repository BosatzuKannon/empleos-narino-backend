-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "paymentMethodExtra" JSONB,
ADD COLUMN     "paymentMethodType" TEXT;
