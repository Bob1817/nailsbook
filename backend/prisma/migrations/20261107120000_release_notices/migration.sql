CREATE TABLE "ReleaseNotice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "important" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ReleaseNotice_version_audience_key" ON "ReleaseNotice"("version", "audience");
CREATE INDEX "ReleaseNotice_publishedAt_idx" ON "ReleaseNotice"("publishedAt");
