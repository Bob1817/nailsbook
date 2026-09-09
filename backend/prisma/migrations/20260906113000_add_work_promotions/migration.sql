CREATE TABLE "WorkPromotion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '作品分享优惠',
    "discountAmountFen" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkPromotion_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkPromotion_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkPromotion_workId_key" ON "WorkPromotion"("workId");
CREATE INDEX "WorkPromotion_technicianId_enabled_startsAt_endsAt_idx" ON "WorkPromotion"("technicianId", "enabled", "startsAt", "endsAt");

ALTER TABLE "Order" ADD COLUMN "promotionId" INTEGER REFERENCES "WorkPromotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Order_promotionId_idx" ON "Order"("promotionId");
