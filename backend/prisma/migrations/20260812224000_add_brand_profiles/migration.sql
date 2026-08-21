CREATE TABLE "BrandProfile" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "brandName" TEXT NOT NULL,
  "tagline" TEXT,
  "city" TEXT,
  "publicServiceArea" TEXT,
  "artistIntroduction" TEXT,
  "aestheticPhilosophy" TEXT,
  "transportationNotes" TEXT,
  "hygieneStandards" TEXT,
  "materialStandards" TEXT,
  "allergyNotice" TEXT,
  "latePolicy" TEXT,
  "cancellationPolicy" TEXT,
  "aftercarePolicy" TEXT,
  "shareTitle" TEXT,
  "shareDescription" TEXT,
  "shareCoverUrl" TEXT,
  "publicationStatus" TEXT NOT NULL DEFAULT 'draft',
  "publishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandProfile_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BrandProfile_technicianId_key" ON "BrandProfile"("technicianId");
CREATE INDEX "BrandProfile_publicationStatus_updatedAt_idx" ON "BrandProfile"("publicationStatus", "updatedAt");

CREATE TABLE "BrandEnvironmentPhoto" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "brandProfileId" INTEGER NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "caption" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandEnvironmentPhoto_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BrandEnvironmentPhoto_brandProfileId_sortOrder_idx" ON "BrandEnvironmentPhoto"("brandProfileId", "sortOrder");

CREATE TABLE "BrandFaq" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "brandProfileId" INTEGER NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandFaq_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BrandFaq_brandProfileId_isActive_sortOrder_idx" ON "BrandFaq"("brandProfileId", "isActive", "sortOrder");

-- Preserve the existing public homepage for active technicians while moving
-- editable brand content into the new structured model.
INSERT INTO "BrandProfile" (
  "technicianId", "brandName", "city", "publicServiceArea",
  "artistIntroduction", "publicationStatus", "publishedAt"
)
SELECT
  "id", "name", "city", "serviceArea", "bio",
  CASE WHEN "status" = 'active' THEN 'published' ELSE 'draft' END,
  CASE WHEN "status" = 'active' THEN CURRENT_TIMESTAMP ELSE NULL END
FROM "Technician";
