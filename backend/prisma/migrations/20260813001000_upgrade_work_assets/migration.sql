ALTER TABLE "NailWork" ADD COLUMN "style" TEXT;
ALTER TABLE "NailWork" ADD COLUMN "color" TEXT;
ALTER TABLE "NailWork" ADD COLUMN "nailShape" TEXT;
ALTER TABLE "NailWork" ADD COLUMN "nailLength" TEXT;
ALTER TABLE "NailWork" ADD COLUMN "suitableSkinTones" TEXT;
ALTER TABLE "NailWork" ADD COLUMN "scenes" TEXT;
ALTER TABLE "NailWork" ADD COLUMN "productionMinutes" INTEGER;
ALTER TABLE "NailWork" ADD COLUMN "craftHighlights" TEXT;
ALTER TABLE "NailWork" ADD COLUMN "priceDisplayPolicy" TEXT NOT NULL DEFAULT 'exact';
ALTER TABLE "NailWork" ADD COLUMN "referencePriceMinFen" INTEGER;
ALTER TABLE "NailWork" ADD COLUMN "referencePriceMaxFen" INTEGER;
ALTER TABLE "NailWork" ADD COLUMN "isReproducible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NailWork" ADD COLUMN "reproductionNotes" TEXT;
ALTER TABLE "NailWork" ADD COLUMN "assetStatus" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "NailWork" ADD COLUMN "publicAuthorizationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "NailWork" ADD COLUMN "publicSortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "NailWork" ADD COLUMN "archivedAt" DATETIME;

UPDATE "NailWork"
SET "scenes" = "suitableScene",
    "referencePriceMinFen" = CASE WHEN "price" IS NULL THEN NULL ELSE CAST(ROUND("price" * 100) AS INTEGER) END,
    "referencePriceMaxFen" = CASE WHEN "price" IS NULL THEN NULL ELSE CAST(ROUND("price" * 100) AS INTEGER) END,
    "assetStatus" = CASE
      WHEN "publicationStatus" = 'draft' THEN 'draft'
      WHEN "visibilityScope" = 'public' AND "publicationStatus" = 'approved' AND "isVisible" = true THEN 'public'
      ELSE 'internal'
    END,
    "publicAuthorizationStatus" = CASE
      WHEN "visibilityScope" = 'public' AND "publicationStatus" = 'approved' THEN 'authorized'
      ELSE 'pending'
    END,
    "publicSortOrder" = "sortOrder";

CREATE INDEX "NailWork_techId_assetStatus_archivedAt_idx" ON "NailWork"("techId", "assetStatus", "archivedAt");
CREATE INDEX "NailWork_techId_style_color_nailShape_idx" ON "NailWork"("techId", "style", "color", "nailShape");
CREATE INDEX "NailWork_assetStatus_publicAuthorizationStatus_publicSortOrder_idx" ON "NailWork"("assetStatus", "publicAuthorizationStatus", "publicSortOrder");
