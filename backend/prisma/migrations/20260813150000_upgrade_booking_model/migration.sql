ALTER TABLE "Order" ADD COLUMN "sourceLeadId" INTEGER REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD COLUMN "applicationKey" TEXT;
CREATE UNIQUE INDEX "Order_applicationKey_key" ON "Order"("applicationKey");
ALTER TABLE "Order" ADD COLUMN "bookingPhase" TEXT NOT NULL DEFAULT 'application';
ALTER TABLE "Order" ADD COLUMN "expectedDate" DATETIME;
ALTER TABLE "Order" ADD COLUMN "expectedTimeSlot" TEXT;
ALTER TABLE "Order" ADD COLUMN "confirmedStartTime" DATETIME;
ALTER TABLE "Order" ADD COLUMN "confirmedEndTime" DATETIME;
ALTER TABLE "Order" ADD COLUMN "estimatedAmount" REAL;
ALTER TABLE "Order" ADD COLUMN "confirmedAmount" REAL;
ALTER TABLE "Order" ADD COLUMN "actualAmount" REAL;
ALTER TABLE "Order" ADD COLUMN "materialCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "noShowReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "aftercareDeadline" DATETIME;
ALTER TABLE "Order" ADD COLUMN "suggestedMaintenanceAt" DATETIME;
CREATE INDEX "Order_sourceLeadId_idx" ON "Order"("sourceLeadId");

UPDATE "Order" SET "bookingPhase" = CASE
  WHEN "status" IN ('pending_home','pending_shop') THEN 'booking'
  WHEN "status" = 'in_progress' THEN 'in_service'
  WHEN "status" = 'completed' THEN 'finished'
  WHEN "status" IN ('cancelled','expired','no_show','rejected') THEN 'closed'
  ELSE 'application' END;
UPDATE "Order" SET "confirmedStartTime"="startTime", "confirmedEndTime"="endTime" WHERE "bookingPhase" IN ('booking','in_service','finished');
UPDATE "Order" SET "estimatedAmount"="quotePrice", "confirmedAmount"="quotePrice", "actualAmount"="paidAmount";

CREATE TABLE "OrderIntentWork" (
  "orderId" INTEGER NOT NULL,
  "workId" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("orderId","workId"),
  CONSTRAINT "OrderIntentWork_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderIntentWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "OrderIntentWork_workId_idx" ON "OrderIntentWork"("workId");
INSERT OR IGNORE INTO "OrderIntentWork" ("orderId","workId") SELECT "id","sourceWorkId" FROM "Order" WHERE "sourceWorkId" IS NOT NULL;
