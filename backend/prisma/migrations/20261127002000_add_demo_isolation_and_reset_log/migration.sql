-- AlterTable
ALTER TABLE "Technician" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ClientUser" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DemoResetLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seedVersion" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "affectedTech" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Technician_isDemo_idx" ON "Technician"("isDemo");

-- CreateIndex
CREATE INDEX "ClientUser_isDemo_idx" ON "ClientUser"("isDemo");

-- CreateIndex
CREATE INDEX "DemoResetLog_createdAt_idx" ON "DemoResetLog"("createdAt");

-- CreateIndex
CREATE INDEX "DemoResetLog_status_idx" ON "DemoResetLog"("status");
