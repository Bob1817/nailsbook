ALTER TABLE "CustomerProfileFact" ADD COLUMN "confirmationCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "WorkPreparation" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "WorkPreparationRevision" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "workId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "sourceRecordId" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "tools" TEXT,
  "materials" TEXT,
  "preparation" TEXT,
  "steps" TEXT,
  "riskNotes" TEXT,
  "estimatedMinutes" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "WorkPreparationRevision_workId_version_key" ON "WorkPreparationRevision"("workId", "version");
CREATE INDEX "WorkPreparationRevision_workId_createdAt_idx" ON "WorkPreparationRevision"("workId", "createdAt");
CREATE INDEX "WorkPreparationRevision_technicianId_createdAt_idx" ON "WorkPreparationRevision"("technicianId", "createdAt");
CREATE INDEX "WorkPreparationRevision_sourceRecordId_idx" ON "WorkPreparationRevision"("sourceRecordId");

CREATE TABLE "ServiceRecordAssociationCorrection" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderId" INTEGER NOT NULL,
  "recordId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "entityType" TEXT NOT NULL,
  "fromId" INTEGER,
  "toId" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ServiceRecordAssociationCorrection_recordId_createdAt_idx" ON "ServiceRecordAssociationCorrection"("recordId", "createdAt");
CREATE INDEX "ServiceRecordAssociationCorrection_technicianId_createdAt_idx" ON "ServiceRecordAssociationCorrection"("technicianId", "createdAt");
