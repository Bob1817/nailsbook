ALTER TABLE "Customer" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'historical';
ALTER TABLE "Customer" ADD COLUMN "sourceRef" TEXT;

CREATE TABLE "CustomerFollowUp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "plannedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerFollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerFollowUp_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CustomerFollowUp_customerId_plannedAt_idx" ON "CustomerFollowUp"("customerId", "plannedAt");
CREATE INDEX "CustomerFollowUp_technicianId_status_plannedAt_idx" ON "CustomerFollowUp"("technicianId", "status", "plannedAt");
