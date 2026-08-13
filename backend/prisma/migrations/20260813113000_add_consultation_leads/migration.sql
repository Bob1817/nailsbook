CREATE TABLE "Lead" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "clientUserId" INTEGER,
  "customerId" INTEGER,
  "convertedOrderId" INTEGER,
  "visitorId" TEXT,
  "sourceChannel" TEXT NOT NULL DEFAULT 'direct',
  "sourceCampaign" TEXT,
  "sourceContent" TEXT,
  "sourceWorkId" INTEGER,
  "firstTouchpoint" TEXT,
  "latestTouchpoint" TEXT,
  "nickname" TEXT,
  "contact" TEXT,
  "requirement" TEXT,
  "budget" TEXT,
  "expectedDate" DATETIME,
  "privacyAgreedAt" DATETIME,
  "submissionKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "lostReason" TEXT,
  "lostReasonNote" TEXT,
  "nextFollowUpAt" DATETIME,
  "pausedAt" DATETIME,
  "convertedAt" DATETIME,
  "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dedupeKey" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Lead_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Lead_convertedOrderId_fkey" FOREIGN KEY ("convertedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Lead_sourceWorkId_fkey" FOREIGN KEY ("sourceWorkId") REFERENCES "NailWork"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Lead_dedupeKey_key" ON "Lead"("dedupeKey");
CREATE UNIQUE INDEX "Lead_submissionKey_key" ON "Lead"("submissionKey");
CREATE INDEX "Lead_technicianId_status_nextFollowUpAt_idx" ON "Lead"("technicianId", "status", "nextFollowUpAt");
CREATE INDEX "Lead_technicianId_sourceChannel_createdAt_idx" ON "Lead"("technicianId", "sourceChannel", "createdAt");
CREATE INDEX "Lead_visitorId_technicianId_idx" ON "Lead"("visitorId", "technicianId");

CREATE TABLE "LeadFollowUp" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "leadId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "nextFollowUpAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LeadFollowUp_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LeadFollowUp_leadId_createdAt_idx" ON "LeadFollowUp"("leadId", "createdAt");
CREATE INDEX "LeadFollowUp_technicianId_nextFollowUpAt_idx" ON "LeadFollowUp"("technicianId", "nextFollowUpAt");

CREATE TABLE "LeadStatusHistory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "leadId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LeadStatusHistory_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LeadStatusHistory_leadId_createdAt_idx" ON "LeadStatusHistory"("leadId", "createdAt");
