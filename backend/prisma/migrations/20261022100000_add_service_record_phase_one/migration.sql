PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ServiceRecord" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "customerId" INTEGER NOT NULL,
  "actualStartTime" DATETIME,
  "actualEndTime" DATETIME,
  "actualAmount" REAL,
  "materialCost" REAL NOT NULL DEFAULT 0,
  "materials" TEXT,
  "techniques" TEXT,
  "nailCondition" TEXT,
  "customerFeedback" TEXT,
  "careAdvice" TEXT,
  "tools" TEXT,
  "clientReaction" TEXT,
  "discomfortNotes" TEXT,
  "preferenceNotes" TEXT,
  "nextServiceNotes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "completedAt" DATETIME,
  "aftercareDeadline" DATETIME,
  "suggestedMaintenanceAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceRecord_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_ServiceRecord" ("id", "orderId", "technicianId", "customerId", "actualStartTime", "actualEndTime", "actualAmount", "materialCost", "materials", "techniques", "nailCondition", "customerFeedback", "careAdvice", "status", "completedAt", "aftercareDeadline", "suggestedMaintenanceAt", "createdAt", "updatedAt")
SELECT "id", "orderId", "technicianId", "customerId", "actualStartTime", "actualEndTime", "actualAmount", "materialCost", "materials", "techniques", "nailCondition", "customerFeedback", "careAdvice", 'complete', "actualEndTime", "aftercareDeadline", "suggestedMaintenanceAt", "createdAt", "updatedAt" FROM "ServiceRecord";

DROP TABLE "ServiceRecord";
ALTER TABLE "new_ServiceRecord" RENAME TO "ServiceRecord";
CREATE UNIQUE INDEX "ServiceRecord_orderId_key" ON "ServiceRecord"("orderId");
CREATE INDEX "ServiceRecord_technicianId_actualEndTime_idx" ON "ServiceRecord"("technicianId", "actualEndTime");
CREATE INDEX "ServiceRecord_customerId_actualEndTime_idx" ON "ServiceRecord"("customerId", "actualEndTime");

CREATE TABLE "ServiceRecordPhoto" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "serviceRecordId" INTEGER NOT NULL,
  "stage" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'technician',
  "capturedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceRecordPhoto_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ServiceRecordPhoto_serviceRecordId_stage_sortOrder_idx" ON "ServiceRecordPhoto"("serviceRecordId", "stage", "sortOrder");

CREATE TABLE "CustomerProfileFact" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "customerId" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sourceRecordId" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'active',
  "confirmedById" INTEGER NOT NULL,
  "firstObservedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastConfirmedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerProfileFact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CustomerProfileFact_customerId_category_content_key" ON "CustomerProfileFact"("customerId", "category", "content");
CREATE INDEX "CustomerProfileFact_customerId_category_status_idx" ON "CustomerProfileFact"("customerId", "category", "status");
CREATE INDEX "CustomerProfileFact_sourceRecordId_idx" ON "CustomerProfileFact"("sourceRecordId");

CREATE TABLE "WorkPreparation" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "workId" INTEGER NOT NULL,
  "tools" TEXT,
  "materials" TEXT,
  "preparation" TEXT,
  "steps" TEXT,
  "riskNotes" TEXT,
  "estimatedMinutes" INTEGER,
  "sourceRecordId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkPreparation_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkPreparation_workId_key" ON "WorkPreparation"("workId");
CREATE INDEX "WorkPreparation_sourceRecordId_idx" ON "WorkPreparation"("sourceRecordId");

PRAGMA foreign_keys=ON;
