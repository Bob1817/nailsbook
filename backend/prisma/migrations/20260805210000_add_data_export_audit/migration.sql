CREATE TABLE "DataExportAudit" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "exportType" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "rowCount" INTEGER NOT NULL,
  "filters" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataExportAudit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DataExportAudit_technicianId_createdAt_idx" ON "DataExportAudit"("technicianId", "createdAt");
