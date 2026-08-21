CREATE TABLE "UploadedAsset" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "highUrl" TEXT NOT NULL,
  "mediumUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT NOT NULL,
  "bytesStored" INTEGER NOT NULL,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadedAsset_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UploadedAsset_url_key" ON "UploadedAsset"("url");
CREATE INDEX "UploadedAsset_technicianId_deletedAt_idx" ON "UploadedAsset"("technicianId", "deletedAt");
