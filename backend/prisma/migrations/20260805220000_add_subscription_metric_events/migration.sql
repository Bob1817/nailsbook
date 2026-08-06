CREATE TABLE "SubscriptionMetricEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "eventType" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "planCode" TEXT,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionMetricEvent_technicianId_fkey"
    FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SubscriptionMetricEvent_eventType_createdAt_idx"
  ON "SubscriptionMetricEvent"("eventType", "createdAt");
CREATE INDEX "SubscriptionMetricEvent_technicianId_createdAt_idx"
  ON "SubscriptionMetricEvent"("technicianId", "createdAt");
