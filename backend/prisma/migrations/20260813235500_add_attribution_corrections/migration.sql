CREATE TABLE "AttributionCorrection" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" INTEGER NOT NULL,
  "oldChannel" TEXT,
  "newChannel" TEXT NOT NULL,
  "oldWorkId" INTEGER,
  "newWorkId" INTEGER,
  "reason" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttributionCorrection_technicianId_fkey" FOREIGN KEY("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AttributionCorrection_technicianId_entityType_entityId_createdAt_idx" ON "AttributionCorrection"("technicianId","entityType","entityId","createdAt");
