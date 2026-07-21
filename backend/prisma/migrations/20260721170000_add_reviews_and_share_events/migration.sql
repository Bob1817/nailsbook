CREATE TABLE "ServiceReview" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderId" INTEGER NOT NULL,
  "clientUserId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "rating" INTEGER NOT NULL,
  "content" TEXT,
  "photos" TEXT,
  "photoUseAuthorized" BOOLEAN NOT NULL DEFAULT false,
  "photoUseAuthorizedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ServiceReview_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ServiceReview_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceReview_orderId_key" ON "ServiceReview"("orderId");
CREATE INDEX "ServiceReview_clientUserId_idx" ON "ServiceReview"("clientUserId");
CREATE INDEX "ServiceReview_technicianId_rating_idx" ON "ServiceReview"("technicianId", "rating");

CREATE TABLE "NailWorkShareEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "workId" INTEGER NOT NULL,
  "clientUserId" INTEGER,
  "shareGrantId" INTEGER,
  "eventType" TEXT NOT NULL,
  "channel" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NailWorkShareEvent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NailWorkShareEvent_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "NailWorkShareEvent_shareGrantId_fkey" FOREIGN KEY ("shareGrantId") REFERENCES "NailWorkShareGrant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "NailWorkShareEvent_workId_eventType_idx" ON "NailWorkShareEvent"("workId", "eventType");
CREATE INDEX "NailWorkShareEvent_clientUserId_idx" ON "NailWorkShareEvent"("clientUserId");
CREATE INDEX "NailWorkShareEvent_shareGrantId_idx" ON "NailWorkShareEvent"("shareGrantId");
CREATE INDEX "NailWorkShareEvent_createdAt_idx" ON "NailWorkShareEvent"("createdAt");
