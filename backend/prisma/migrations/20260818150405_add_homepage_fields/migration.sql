-- CreateTable
CREATE TABLE "TechnicianQualification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "organization" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "imageUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicianQualification_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnicianFeaturedComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicianFeaturedComment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConversionEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" TEXT NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "workId" INTEGER,
    "clientUserId" INTEGER,
    "visitorId" TEXT,
    "eventType" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL DEFAULT 'direct',
    "touchpoint" TEXT,
    "campaign" TEXT,
    "content" TEXT,
    "dedupeKey" TEXT,
    CONSTRAINT "ConversionEvent_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversionEvent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversionEvent_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConversionEvent" ("clientUserId", "createdAt", "eventId", "eventType", "id", "source", "technicianId", "visitorId", "workId") SELECT "clientUserId", "createdAt", "eventId", "eventType", "id", "source", "technicianId", "visitorId", "workId" FROM "ConversionEvent";
DROP TABLE "ConversionEvent";
ALTER TABLE "new_ConversionEvent" RENAME TO "ConversionEvent";
CREATE UNIQUE INDEX "ConversionEvent_eventId_key" ON "ConversionEvent"("eventId");
CREATE UNIQUE INDEX "ConversionEvent_dedupeKey_key" ON "ConversionEvent"("dedupeKey");
CREATE INDEX "ConversionEvent_technicianId_eventType_createdAt_idx" ON "ConversionEvent"("technicianId", "eventType", "createdAt");
CREATE INDEX "ConversionEvent_workId_eventType_createdAt_idx" ON "ConversionEvent"("workId", "eventType", "createdAt");
CREATE INDEX "ConversionEvent_visitorId_createdAt_idx" ON "ConversionEvent"("visitorId", "createdAt");
CREATE TABLE "new_MarketingMaterial" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "exportCount" INTEGER NOT NULL DEFAULT 0,
    "freeReexportCount" INTEGER NOT NULL DEFAULT 0,
    "lastExportedAt" DATETIME,
    "lastChargedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketingMaterial_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MarketingMaterial" ("content", "createdAt", "exportCount", "freeReexportCount", "id", "lastChargedAt", "lastExportedAt", "revision", "status", "technicianId", "title", "type", "updatedAt") SELECT "content", "createdAt", "exportCount", "freeReexportCount", "id", "lastChargedAt", "lastExportedAt", "revision", "status", "technicianId", "title", "type", "updatedAt" FROM "MarketingMaterial";
DROP TABLE "MarketingMaterial";
ALTER TABLE "new_MarketingMaterial" RENAME TO "MarketingMaterial";
CREATE INDEX "MarketingMaterial_technicianId_updatedAt_idx" ON "MarketingMaterial"("technicianId", "updatedAt");
CREATE TABLE "new_NailWork" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "techId" INTEGER NOT NULL,
    "title" TEXT,
    "coverUrl" TEXT,
    "images" TEXT,
    "description" TEXT,
    "designIdea" TEXT,
    "suitableScene" TEXT,
    "recommendationScore" INTEGER,
    "tags" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "price" REAL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isHomepageFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publicationStatus" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "reviewedBy" INTEGER,
    "publishedAt" DATETIME,
    "visibilityScope" TEXT NOT NULL DEFAULT 'public',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceId" INTEGER,
    "style" TEXT,
    "color" TEXT,
    "nailShape" TEXT,
    "nailLength" TEXT,
    "suitableSkinTones" TEXT,
    "scenes" TEXT,
    "productionMinutes" INTEGER,
    "craftHighlights" TEXT,
    "priceDisplayPolicy" TEXT NOT NULL DEFAULT 'exact',
    "referencePriceMinFen" INTEGER,
    "referencePriceMaxFen" INTEGER,
    "isReproducible" BOOLEAN NOT NULL DEFAULT true,
    "reproductionNotes" TEXT,
    "assetStatus" TEXT NOT NULL DEFAULT 'draft',
    "publicAuthorizationStatus" TEXT NOT NULL DEFAULT 'pending',
    "publicSortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    "sourceOrderId" INTEGER,
    CONSTRAINT "NailWork_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NailWork_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NailWork_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NailWork" ("archivedAt", "assetStatus", "color", "coverUrl", "craftHighlights", "createdAt", "description", "designIdea", "id", "images", "isFeatured", "isHomepageFeatured", "isPinned", "isReproducible", "isVisible", "nailLength", "nailShape", "price", "priceDisplayPolicy", "productionMinutes", "publicAuthorizationStatus", "publicSortOrder", "publicationStatus", "publishedAt", "recommendationScore", "referencePriceMaxFen", "referencePriceMinFen", "reproductionNotes", "reviewNote", "reviewedAt", "reviewedBy", "scenes", "serviceId", "sortOrder", "sourceOrderId", "style", "suitableScene", "suitableSkinTones", "tags", "techId", "title", "updatedAt", "viewCount", "visibilityScope") SELECT "archivedAt", "assetStatus", "color", "coverUrl", "craftHighlights", "createdAt", "description", "designIdea", "id", "images", "isFeatured", "isHomepageFeatured", "isPinned", "isReproducible", "isVisible", "nailLength", "nailShape", "price", "priceDisplayPolicy", "productionMinutes", "publicAuthorizationStatus", "publicSortOrder", "publicationStatus", "publishedAt", "recommendationScore", "referencePriceMaxFen", "referencePriceMinFen", "reproductionNotes", "reviewNote", "reviewedAt", "reviewedBy", "scenes", "serviceId", "sortOrder", "sourceOrderId", "style", "suitableScene", "suitableSkinTones", "tags", "techId", "title", "updatedAt", "viewCount", "visibilityScope" FROM "NailWork";
DROP TABLE "NailWork";
ALTER TABLE "new_NailWork" RENAME TO "NailWork";
CREATE UNIQUE INDEX "NailWork_sourceOrderId_key" ON "NailWork"("sourceOrderId");
CREATE INDEX "NailWork_techId_idx" ON "NailWork"("techId");
CREATE INDEX "NailWork_isVisible_idx" ON "NailWork"("isVisible");
CREATE INDEX "NailWork_isHomepageFeatured_idx" ON "NailWork"("isHomepageFeatured");
CREATE INDEX "NailWork_publicationStatus_createdAt_idx" ON "NailWork"("publicationStatus", "createdAt");
CREATE INDEX "NailWork_serviceId_idx" ON "NailWork"("serviceId");
CREATE INDEX "NailWork_techId_assetStatus_archivedAt_idx" ON "NailWork"("techId", "assetStatus", "archivedAt");
CREATE INDEX "NailWork_techId_style_color_nailShape_idx" ON "NailWork"("techId", "style", "color", "nailShape");
CREATE INDEX "NailWork_assetStatus_publicAuthorizationStatus_publicSortOrder_idx" ON "NailWork"("assetStatus", "publicAuthorizationStatus", "publicSortOrder");
CREATE TABLE "new_ServiceReview" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "clientUserId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "photos" TEXT,
    "photoUseAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "photoUseAuthorizedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationSource" TEXT NOT NULL DEFAULT 'completed_order',
    "moderationStatus" TEXT NOT NULL DEFAULT 'pending',
    "publicationStatus" TEXT NOT NULL DEFAULT 'private',
    "moderatedAt" DATETIME,
    "moderatorId" INTEGER,
    "technicianReply" TEXT,
    "repliedAt" DATETIME,
    "reviewInvitationId" INTEGER,
    CONSTRAINT "ServiceReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceReview_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceReview_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceReview_reviewInvitationId_fkey" FOREIGN KEY ("reviewInvitationId") REFERENCES "ReviewInvitation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceReview" ("clientUserId", "content", "createdAt", "id", "moderatedAt", "moderationStatus", "moderatorId", "orderId", "photoUseAuthorized", "photoUseAuthorizedAt", "photos", "publicationStatus", "rating", "repliedAt", "reviewInvitationId", "technicianId", "technicianReply", "updatedAt", "verificationSource") SELECT "clientUserId", "content", "createdAt", "id", "moderatedAt", "moderationStatus", "moderatorId", "orderId", "photoUseAuthorized", "photoUseAuthorizedAt", "photos", "publicationStatus", "rating", "repliedAt", "reviewInvitationId", "technicianId", "technicianReply", "updatedAt", "verificationSource" FROM "ServiceReview";
DROP TABLE "ServiceReview";
ALTER TABLE "new_ServiceReview" RENAME TO "ServiceReview";
CREATE UNIQUE INDEX "ServiceReview_orderId_key" ON "ServiceReview"("orderId");
CREATE UNIQUE INDEX "ServiceReview_reviewInvitationId_key" ON "ServiceReview"("reviewInvitationId");
CREATE INDEX "ServiceReview_clientUserId_idx" ON "ServiceReview"("clientUserId");
CREATE INDEX "ServiceReview_technicianId_rating_idx" ON "ServiceReview"("technicianId", "rating");
CREATE TABLE "new_SubscriptionResourceUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "marketingExports" INTEGER NOT NULL DEFAULT 0,
    "smsSent" INTEGER NOT NULL DEFAULT 0,
    "storageBytes" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionResourceUsage_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SubscriptionResourceUsage" ("createdAt", "id", "marketingExports", "period", "smsSent", "storageBytes", "technicianId", "updatedAt") SELECT "createdAt", "id", "marketingExports", "period", "smsSent", "storageBytes", "technicianId", "updatedAt" FROM "SubscriptionResourceUsage";
DROP TABLE "SubscriptionResourceUsage";
ALTER TABLE "new_SubscriptionResourceUsage" RENAME TO "SubscriptionResourceUsage";
CREATE INDEX "SubscriptionResourceUsage_period_idx" ON "SubscriptionResourceUsage"("period");
CREATE UNIQUE INDEX "SubscriptionResourceUsage_technicianId_period_key" ON "SubscriptionResourceUsage"("technicianId", "period");
CREATE TABLE "new_Technician" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "managedPasswordCiphertext" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "city" TEXT,
    "province" TEXT,
    "serviceArea" TEXT,
    "bio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "invitationCode" TEXT,
    "invitedAt" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "homeService" BOOLEAN NOT NULL DEFAULT false,
    "shopService" BOOLEAN NOT NULL DEFAULT false,
    "shopAddresses" TEXT,
    "serviceItems" TEXT,
    "homeServiceRadius" REAL,
    "homeServicePricing" TEXT,
    "nightServiceFee" REAL,
    "holidayServiceFee" REAL,
    "minOrderAmount" REAL,
    "socialMedia" TEXT,
    "serviceSchedule" TEXT,
    "customTags" TEXT,
    "coverImageUrl" TEXT,
    "servicePhilosophy" TEXT,
    "bookingNotes" TEXT,
    "styleTags" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME
);
INSERT INTO "new_Technician" ("avatarUrl", "bio", "city", "createdAt", "customTags", "holidayServiceFee", "homeService", "homeServicePricing", "homeServiceRadius", "id", "invitationCode", "invitedAt", "lastLoginAt", "managedPasswordCiphertext", "minOrderAmount", "mustChangePassword", "name", "nightServiceFee", "passwordHash", "phone", "province", "serviceArea", "serviceItems", "serviceSchedule", "shopAddresses", "shopService", "socialMedia", "status", "tokenVersion", "updatedAt") SELECT "avatarUrl", "bio", "city", "createdAt", "customTags", "holidayServiceFee", "homeService", "homeServicePricing", "homeServiceRadius", "id", "invitationCode", "invitedAt", "lastLoginAt", "managedPasswordCiphertext", "minOrderAmount", "mustChangePassword", "name", "nightServiceFee", "passwordHash", "phone", "province", "serviceArea", "serviceItems", "serviceSchedule", "shopAddresses", "shopService", "socialMedia", "status", "tokenVersion", "updatedAt" FROM "Technician";
DROP TABLE "Technician";
ALTER TABLE "new_Technician" RENAME TO "Technician";
CREATE UNIQUE INDEX "Technician_phone_key" ON "Technician"("phone");
CREATE UNIQUE INDEX "Technician_invitationCode_key" ON "Technician"("invitationCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TechnicianQualification_technicianId_type_idx" ON "TechnicianQualification"("technicianId", "type");

-- CreateIndex
CREATE INDEX "TechnicianQualification_technicianId_sortOrder_idx" ON "TechnicianQualification"("technicianId", "sortOrder");

-- CreateIndex
CREATE INDEX "TechnicianFeaturedComment_technicianId_sortOrder_idx" ON "TechnicianFeaturedComment"("technicianId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianFeaturedComment_technicianId_commentId_key" ON "TechnicianFeaturedComment"("technicianId", "commentId");
