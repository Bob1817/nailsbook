ALTER TABLE "Order" ADD COLUMN "bookingType" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "Order" ADD COLUMN "serviceSubtotalFen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "discountAmountFen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "finalPriceFen" INTEGER;
ALTER TABLE "Order" ADD COLUMN "totalDurationMinutes" INTEGER;

ALTER TABLE "NailWork" ADD COLUMN "serviceSubtotalFen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "NailWork" ADD COLUMN "standardPriceFen" INTEGER;
ALTER TABLE "NailWork" ADD COLUMN "totalDurationMinutes" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "NailWorkServiceLine" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "workId" INTEGER NOT NULL,
  "serviceId" INTEGER,
  "servicePublicIdSnapshot" TEXT,
  "nameSnapshot" TEXT NOT NULL,
  "unitPriceFen" INTEGER NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "subtotalFen" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NailWorkServiceLine_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NailWorkServiceLine_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "OrderServiceLine" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderId" INTEGER NOT NULL,
  "serviceId" INTEGER,
  "servicePublicIdSnapshot" TEXT,
  "nameSnapshot" TEXT NOT NULL,
  "unitPriceFen" INTEGER NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "subtotalFen" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderServiceLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderServiceLine_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "NailWorkServiceLine_workId_sortOrder_idx" ON "NailWorkServiceLine"("workId", "sortOrder");
CREATE INDEX "NailWorkServiceLine_serviceId_idx" ON "NailWorkServiceLine"("serviceId");
CREATE INDEX "OrderServiceLine_orderId_sortOrder_idx" ON "OrderServiceLine"("orderId", "sortOrder");
CREATE INDEX "OrderServiceLine_serviceId_idx" ON "OrderServiceLine"("serviceId");
