ALTER TABLE "TechnicianSubscription" ADD COLUMN "pendingPlanCode" TEXT;
ALTER TABLE "TechnicianSubscription" ADD COLUMN "changeEffectiveAt" DATETIME;

CREATE TABLE "SubscriptionUsageEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "resourceType" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 1,
  "period" TEXT NOT NULL,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionUsageEvent_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SubscriptionUsageEvent_technicianId_resourceType_idempotencyKey_key" ON "SubscriptionUsageEvent"("technicianId", "resourceType", "idempotencyKey");
CREATE INDEX "SubscriptionUsageEvent_technicianId_resourceType_period_idx" ON "SubscriptionUsageEvent"("technicianId", "resourceType", "period");
