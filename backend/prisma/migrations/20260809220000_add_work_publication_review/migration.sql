ALTER TABLE "NailWork" ADD COLUMN "publicationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "NailWork" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "NailWork" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "NailWork" ADD COLUMN "reviewedBy" INTEGER;
ALTER TABLE "NailWork" ADD COLUMN "publishedAt" DATETIME;

UPDATE "NailWork"
SET "publicationStatus" = 'approved',
    "publishedAt" = COALESCE("updatedAt", "createdAt")
WHERE "isVisible" = true;

CREATE INDEX "NailWork_publicationStatus_createdAt_idx"
ON "NailWork"("publicationStatus", "createdAt");
