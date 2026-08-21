CREATE TABLE "PublicationConsent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientUserId" INTEGER,
  "customerId" INTEGER,
  "contentType" TEXT NOT NULL,
  "contentId" INTEGER NOT NULL,
  "reviewId" INTEGER,
  "displayIdentity" TEXT NOT NULL DEFAULT 'anonymous',
  "displayName" TEXT,
  "acquisitionMethod" TEXT NOT NULL,
  "grantedAt" DATETIME NOT NULL,
  "revokedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicationConsent_clientUserId_fkey" FOREIGN KEY("clientUserId") REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PublicationConsent_customerId_fkey" FOREIGN KEY("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PublicationConsent_reviewId_fkey" FOREIGN KEY("reviewId") REFERENCES "ServiceReview"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PublicationConsent_contentType_contentId_key" ON "PublicationConsent"("contentType","contentId");
CREATE INDEX "PublicationConsent_clientUserId_revokedAt_idx" ON "PublicationConsent"("clientUserId","revokedAt");
CREATE INDEX "PublicationConsent_customerId_revokedAt_idx" ON "PublicationConsent"("customerId","revokedAt");

-- Existing review photo authorizations become traceable legacy consents.
INSERT INTO "PublicationConsent" ("clientUserId","contentType","contentId","reviewId","displayIdentity","acquisitionMethod","grantedAt")
SELECT "clientUserId",'review_publication',"id","id",'anonymous','legacy_migration',COALESCE("photoUseAuthorizedAt","createdAt")
FROM "ServiceReview" WHERE "photoUseAuthorized"=1;
