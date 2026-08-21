CREATE TABLE "MarketingMaterial" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "exportCount" INTEGER NOT NULL DEFAULT 0,
  "freeReexportCount" INTEGER NOT NULL DEFAULT 0,
  "lastExportedAt" DATETIME,
  "lastChargedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "MarketingMaterial_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "MarketingMaterial_technicianId_updatedAt_idx" ON "MarketingMaterial"("technicianId", "updatedAt");
