-- CreateTable
CREATE TABLE "TechnicianNotice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "coveredCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicianNotice_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnicianActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "recommendToHero" BOOLEAN NOT NULL DEFAULT true,
    "contentBlocks" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicianActivity_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TechnicianNotice_technicianId_status_scheduledAt_idx" ON "TechnicianNotice"("technicianId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "TechnicianActivity_technicianId_status_recommendToHero_idx" ON "TechnicianActivity"("technicianId", "status", "recommendToHero");

-- CreateIndex
CREATE INDEX "TechnicianActivity_technicianId_status_scheduledAt_idx" ON "TechnicianActivity"("technicianId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "TechnicianActivity_technicianId_status_endTime_idx" ON "TechnicianActivity"("technicianId", "status", "endTime");
