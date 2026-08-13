ALTER TABLE "Customer" ADD COLUMN "lifecycleStage" TEXT NOT NULL DEFAULT 'potential';
ALTER TABLE "Customer" ADD COLUMN "lifecycleManual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN "preferredStyles" TEXT;
ALTER TABLE "Customer" ADD COLUMN "preferredColors" TEXT;
ALTER TABLE "Customer" ADD COLUMN "preferredNailShapes" TEXT;
ALTER TABLE "Customer" ADD COLUMN "preferredNailLengths" TEXT;
ALTER TABLE "Customer" ADD COLUMN "preferredPriceMin" REAL;
ALTER TABLE "Customer" ADD COLUMN "preferredPriceMax" REAL;
ALTER TABLE "Customer" ADD COLUMN "allergies" TEXT;
ALTER TABLE "Customer" ADD COLUMN "contraindications" TEXT;
ALTER TABLE "Customer" ADD COLUMN "specialReminders" TEXT;
ALTER TABLE "Customer" ADD COLUMN "referrer" TEXT;
ALTER TABLE "Customer" ADD COLUMN "anonymizedAt" DATETIME;

UPDATE "Customer" SET "lifecycleStage" = CASE WHEN "completedServiceCount" > 0 THEN 'active' ELSE 'potential' END;

CREATE TABLE "CustomerLifecycleHistory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "customerId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "fromStage" TEXT NOT NULL,
  "toStage" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerLifecycleHistory_customerId_fkey" FOREIGN KEY("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerLifecycleHistory_technicianId_fkey" FOREIGN KEY("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CustomerLifecycleHistory_customerId_createdAt_idx" ON "CustomerLifecycleHistory"("customerId","createdAt");
CREATE INDEX "CustomerLifecycleHistory_technicianId_createdAt_idx" ON "CustomerLifecycleHistory"("technicianId","createdAt");
