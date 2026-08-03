CREATE TABLE "ReferralLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "referrerClientId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralLink_referrerClientId_fkey" FOREIGN KEY ("referrerClientId") REFERENCES "ClientUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReferralLink_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ReferralRelation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "referrerClientId" INTEGER NOT NULL,
    "referredClientId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "sourceLinkId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_first_order',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralRelation_referrerClientId_fkey" FOREIGN KEY ("referrerClientId") REFERENCES "ClientUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReferralRelation_referredClientId_fkey" FOREIGN KEY ("referredClientId") REFERENCES "ClientUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReferralRelation_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReferralRelation_sourceLinkId_fkey" FOREIGN KEY ("sourceLinkId") REFERENCES "ReferralLink" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReferralLink_token_key" ON "ReferralLink"("token");
CREATE INDEX "ReferralLink_referrerClientId_technicianId_idx" ON "ReferralLink"("referrerClientId", "technicianId");
CREATE INDEX "ReferralLink_expiresAt_idx" ON "ReferralLink"("expiresAt");
CREATE UNIQUE INDEX "ReferralRelation_technicianId_referredClientId_key" ON "ReferralRelation"("technicianId", "referredClientId");
CREATE INDEX "ReferralRelation_referrerClientId_technicianId_idx" ON "ReferralRelation"("referrerClientId", "technicianId");
