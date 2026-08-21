CREATE TABLE "Service" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "publicId" TEXT NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "durationMinutes" INTEGER,
  "priceType" TEXT NOT NULL DEFAULT 'fixed',
  "priceMinFen" INTEGER,
  "priceMaxFen" INTEGER,
  "isBookable" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Service_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Service_technicianId_publicId_key" ON "Service"("technicianId", "publicId");
CREATE INDEX "Service_technicianId_archivedAt_isBookable_sortOrder_idx" ON "Service"("technicianId", "archivedAt", "isBookable", "sortOrder");

ALTER TABLE "Order" ADD COLUMN "serviceId" INTEGER REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Order_serviceId_idx" ON "Order"("serviceId");
ALTER TABLE "NailWork" ADD COLUMN "serviceId" INTEGER REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "NailWork_serviceId_idx" ON "NailWork"("serviceId");

-- SQLite JSON1 is available in the supported runtime. Preserve the legacy
-- public service id so existing clients can keep submitting selectedServiceIds.
INSERT INTO "Service" (
  "publicId", "technicianId", "name", "description", "category",
  "durationMinutes", "priceType", "priceMinFen", "priceMaxFen",
  "isBookable", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  COALESCE(json_extract(item.value, '$.id'), 'legacy_' || technician.id || '_' || item.key),
  technician.id,
  COALESCE(json_extract(item.value, '$.name'), '未命名服务'),
  json_extract(item.value, '$.description'),
  COALESCE(json_extract(item.value, '$.category'), 'basic_care'),
  CAST(json_extract(item.value, '$.durationMinutes') AS INTEGER),
  CASE
    WHEN json_extract(item.value, '$.priceMin') IS NOT NULL OR json_extract(item.value, '$.priceMax') IS NOT NULL THEN 'range'
    ELSE 'fixed'
  END,
  CAST(ROUND(COALESCE(json_extract(item.value, '$.priceMin'), json_extract(item.value, '$.price')) * 100) AS INTEGER),
  CAST(ROUND(COALESCE(json_extract(item.value, '$.priceMax'), json_extract(item.value, '$.price')) * 100) AS INTEGER),
  CASE WHEN json_extract(item.value, '$.isActive') = 0 THEN false ELSE true END,
  COALESCE(CAST(json_extract(item.value, '$.sortOrder') AS INTEGER), CAST(item.key AS INTEGER) + 1),
  COALESCE(json_extract(item.value, '$.createdAt'), CURRENT_TIMESTAMP),
  COALESCE(json_extract(item.value, '$.updatedAt'), CURRENT_TIMESTAMP)
FROM "Technician" technician, json_each(technician."serviceItems") item
WHERE technician."serviceItems" IS NOT NULL
  AND json_valid(technician."serviceItems")
  AND json_type(technician."serviceItems") = 'array';
