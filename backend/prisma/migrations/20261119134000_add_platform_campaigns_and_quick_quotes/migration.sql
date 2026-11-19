-- CreateTable
CREATE TABLE "PlatformCampaign" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "coverUrl" TEXT,
    "badgeText" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT 'all',
    "displayLocations" TEXT NOT NULL DEFAULT '[]',
    "actionType" TEXT NOT NULL DEFAULT 'page',
    "actionUrl" TEXT,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QuickQuoteSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quoteNo" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "themeCode" TEXT NOT NULL DEFAULT 'minimal-white',
    "technicianName" TEXT,
    "technicianPhone" TEXT,
    "shopName" TEXT,
    "technicianId" INTEGER,
    "itemsJson" TEXT NOT NULL,
    "sumPriceFen" INTEGER NOT NULL,
    "finalPriceFen" INTEGER NOT NULL,
    "adjustmentType" TEXT NOT NULL DEFAULT 'NONE',
    "adjustmentFen" INTEGER NOT NULL DEFAULT 0,
    "adjustmentNote" TEXT,
    "isInteractive" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "viewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PlatformCampaign_status_startTime_endTime_idx" ON "PlatformCampaign"("status", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "PlatformCampaign_targetAudience_status_idx" ON "PlatformCampaign"("targetAudience", "status");

-- CreateIndex
CREATE INDEX "PlatformCampaign_sortOrder_createdAt_idx" ON "PlatformCampaign"("sortOrder", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuickQuoteSnapshot_quoteNo_key" ON "QuickQuoteSnapshot"("quoteNo");

-- CreateIndex
CREATE UNIQUE INDEX "QuickQuoteSnapshot_publicToken_key" ON "QuickQuoteSnapshot"("publicToken");

-- CreateIndex
CREATE INDEX "QuickQuoteSnapshot_publicToken_idx" ON "QuickQuoteSnapshot"("publicToken");

-- CreateIndex
CREATE INDEX "QuickQuoteSnapshot_expiresAt_idx" ON "QuickQuoteSnapshot"("expiresAt");
