CREATE TABLE "ConversionEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" TEXT NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "workId" INTEGER,
    "clientUserId" INTEGER,
    "visitorId" TEXT,
    "eventType" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversionEvent_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversionEvent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversionEvent_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ConversionEvent_eventId_key" ON "ConversionEvent"("eventId");
CREATE INDEX "ConversionEvent_technicianId_eventType_createdAt_idx" ON "ConversionEvent"("technicianId", "eventType", "createdAt");
CREATE INDEX "ConversionEvent_workId_eventType_createdAt_idx" ON "ConversionEvent"("workId", "eventType", "createdAt");
CREATE INDEX "ConversionEvent_visitorId_createdAt_idx" ON "ConversionEvent"("visitorId", "createdAt");
