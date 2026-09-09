ALTER TABLE "NailWork" ADD COLUMN "heroSlot" INTEGER;
CREATE UNIQUE INDEX "NailWork_techId_heroSlot_key" ON "NailWork"("techId", "heroSlot");

-- Preserve personal featured selections; seed only the first three eligible works.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "techId" ORDER BY "sortOrder" ASC, "createdAt" DESC, id DESC) AS slot
  FROM "NailWork"
  WHERE "isFeatured" = 1 AND "isVisible" = 1 AND "visibilityScope" = 'public'
    AND "publicationStatus" = 'approved' AND "archivedAt" IS NULL AND length(trim(coalesce("coverUrl", ''))) > 0
)
UPDATE "NailWork" SET "heroSlot" = (SELECT slot FROM ranked WHERE ranked.id = "NailWork".id)
WHERE id IN (SELECT id FROM ranked WHERE slot <= 3);

-- SQLite serializes writes: these constraints cover every registration/binding entry,
-- including concurrent requests. Existing over-limit relationships remain intact.
CREATE TRIGGER binding_capacity_insert BEFORE INSERT ON "ClientTechBinding"
WHEN NEW.status IN ('active', 'pending') AND
  (SELECT count(*) FROM "ClientTechBinding" WHERE "clientId" = NEW."clientId" AND status IN ('active', 'pending')) >= 5
BEGIN SELECT RAISE(ABORT, 'BINDING_CAPACITY_REACHED'); END;
CREATE TRIGGER binding_capacity_update BEFORE UPDATE OF status, "clientId" ON "ClientTechBinding"
WHEN NEW.status IN ('active', 'pending') AND (OLD.status NOT IN ('active', 'pending') OR OLD."clientId" != NEW."clientId") AND
  (SELECT count(*) FROM "ClientTechBinding" WHERE "clientId" = NEW."clientId" AND id != OLD.id AND status IN ('active', 'pending')) >= 5
BEGIN SELECT RAISE(ABORT, 'BINDING_CAPACITY_REACHED'); END;

CREATE TRIGGER hero_slot_insert BEFORE INSERT ON "NailWork"
WHEN NEW."heroSlot" IS NOT NULL AND (NEW."heroSlot" NOT BETWEEN 1 AND 3 OR NEW."isVisible" != 1 OR NEW."visibilityScope" != 'public' OR NEW."publicationStatus" != 'approved' OR NEW."archivedAt" IS NOT NULL OR length(trim(coalesce(NEW."coverUrl", ''))) = 0)
BEGIN SELECT RAISE(ABORT, 'HERO_WORK_INELIGIBLE'); END;
CREATE TRIGGER hero_slot_update BEFORE UPDATE OF "heroSlot" ON "NailWork"
WHEN NEW."heroSlot" IS NOT NULL AND (NEW."heroSlot" NOT BETWEEN 1 AND 3 OR NEW."isVisible" != 1 OR NEW."visibilityScope" != 'public' OR NEW."publicationStatus" != 'approved' OR NEW."archivedAt" IS NOT NULL OR length(trim(coalesce(NEW."coverUrl", ''))) = 0)
BEGIN SELECT RAISE(ABORT, 'HERO_WORK_INELIGIBLE'); END;
CREATE TRIGGER hero_remove_ineligible AFTER UPDATE OF "isVisible", "visibilityScope", "publicationStatus", "archivedAt", "coverUrl" ON "NailWork"
WHEN NEW."heroSlot" IS NOT NULL AND (NEW."isVisible" != 1 OR NEW."visibilityScope" != 'public' OR NEW."publicationStatus" != 'approved' OR NEW."archivedAt" IS NOT NULL OR length(trim(coalesce(NEW."coverUrl", ''))) = 0)
BEGIN UPDATE "NailWork" SET "heroSlot" = NULL WHERE id = NEW.id; END;

CREATE TRIGGER featured_capacity_insert BEFORE INSERT ON "NailWork"
WHEN NEW."isFeatured" = 1 AND (SELECT count(*) FROM "NailWork" WHERE "techId" = NEW."techId" AND "isFeatured" = 1) >= 6
BEGIN SELECT RAISE(ABORT, 'FEATURED_CAPACITY_REACHED'); END;
CREATE TRIGGER featured_capacity_update BEFORE UPDATE OF "isFeatured", "techId" ON "NailWork"
WHEN NEW."isFeatured" = 1 AND (OLD."isFeatured" != 1 OR OLD."techId" != NEW."techId") AND
  (SELECT count(*) FROM "NailWork" WHERE "techId" = NEW."techId" AND id != OLD.id AND "isFeatured" = 1) >= 6
BEGIN SELECT RAISE(ABORT, 'FEATURED_CAPACITY_REACHED'); END;
