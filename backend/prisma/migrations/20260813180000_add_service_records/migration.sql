ALTER TABLE "Customer" ADD COLUMN "completedServiceCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN "lifetimePaidAmount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN "lastServiceAt" DATETIME;
ALTER TABLE "Customer" ADD COLUMN "suggestedMaintenanceAt" DATETIME;
CREATE TABLE "ServiceRecord" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "customerId" INTEGER NOT NULL,
  "actualStartTime" DATETIME NOT NULL,
  "actualEndTime" DATETIME NOT NULL,
  "actualAmount" REAL NOT NULL,
  "materialCost" REAL NOT NULL DEFAULT 0,
  "materials" TEXT,
  "techniques" TEXT,
  "nailCondition" TEXT,
  "customerFeedback" TEXT,
  "careAdvice" TEXT,
  "aftercareDeadline" DATETIME NOT NULL,
  "suggestedMaintenanceAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceRecord_orderId_fkey" FOREIGN KEY("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceRecord_technicianId_fkey" FOREIGN KEY("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceRecord_customerId_fkey" FOREIGN KEY("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceRecord_orderId_key" ON "ServiceRecord"("orderId");
CREATE INDEX "ServiceRecord_technicianId_actualEndTime_idx" ON "ServiceRecord"("technicianId","actualEndTime");
CREATE INDEX "ServiceRecord_customerId_actualEndTime_idx" ON "ServiceRecord"("customerId","actualEndTime");
