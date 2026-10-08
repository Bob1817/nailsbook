CREATE TABLE "ArtistHomepageLike" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientUserId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArtistHomepageLike_clientUserId_fkey" FOREIGN KEY("clientUserId") REFERENCES "ClientUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ArtistHomepageLike_technicianId_fkey" FOREIGN KEY("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ArtistHomepageLike_clientUserId_technicianId_key" ON "ArtistHomepageLike"("clientUserId", "technicianId");
CREATE INDEX "ArtistHomepageLike_technicianId_createdAt_idx" ON "ArtistHomepageLike"("technicianId", "createdAt");

CREATE TABLE "ArtistHomepageFavorite" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientUserId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArtistHomepageFavorite_clientUserId_fkey" FOREIGN KEY("clientUserId") REFERENCES "ClientUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ArtistHomepageFavorite_technicianId_fkey" FOREIGN KEY("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ArtistHomepageFavorite_clientUserId_technicianId_key" ON "ArtistHomepageFavorite"("clientUserId", "technicianId");
CREATE INDEX "ArtistHomepageFavorite_technicianId_createdAt_idx" ON "ArtistHomepageFavorite"("technicianId", "createdAt");

CREATE TABLE "ArtistHomepageComment" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientUserId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArtistHomepageComment_clientUserId_fkey" FOREIGN KEY("clientUserId") REFERENCES "ClientUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ArtistHomepageComment_technicianId_fkey" FOREIGN KEY("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ArtistHomepageComment_technicianId_isHidden_isPinned_createdAt_idx" ON "ArtistHomepageComment"("technicianId", "isHidden", "isPinned", "createdAt");
CREATE INDEX "ArtistHomepageComment_clientUserId_createdAt_idx" ON "ArtistHomepageComment"("clientUserId", "createdAt");
