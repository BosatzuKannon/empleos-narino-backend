-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "minVersionCode" INTEGER NOT NULL DEFAULT 1,
    "messageEs" TEXT,
    "appStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "appStatusMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");
