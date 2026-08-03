CREATE TABLE "ReferralCampaign" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "rewardAmount" REAL NOT NULL,
    "minimumOrderAmount" REAL NOT NULL DEFAULT 0,
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralCampaign_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReferralCampaign_technicianId_key" ON "ReferralCampaign"("technicianId");
CREATE INDEX "ReferralCampaign_status_validUntil_idx" ON "ReferralCampaign"("status", "validUntil");
