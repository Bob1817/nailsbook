ALTER TABLE "NailWork" ADD COLUMN "visibilityScope" TEXT NOT NULL DEFAULT 'public';

CREATE TABLE "NailWorkClientAccess" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "workId" INTEGER NOT NULL,
  "customerId" INTEGER NOT NULL,
  "clientUserId" INTEGER,
  "orderId" INTEGER,
  "canView" BOOLEAN NOT NULL DEFAULT true,
  "canShare" BOOLEAN NOT NULL DEFAULT false,
  "canFavorite" BOOLEAN NOT NULL DEFAULT true,
  "canLike" BOOLEAN NOT NULL DEFAULT true,
  "canComment" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NailWorkClientAccess_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NailWorkClientAccess_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NailWorkClientAccess_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "NailWorkClientAccess_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NailWorkClientAccess_workId_customerId_key" ON "NailWorkClientAccess"("workId", "customerId");
CREATE INDEX "NailWorkClientAccess_clientUserId_canView_idx" ON "NailWorkClientAccess"("clientUserId", "canView");
CREATE INDEX "NailWorkClientAccess_orderId_idx" ON "NailWorkClientAccess"("orderId");

CREATE TABLE "NailWorkShareGrant" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "token" TEXT NOT NULL,
  "workId" INTEGER NOT NULL,
  "accessId" INTEGER NOT NULL,
  "clientUserId" INTEGER NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "revokedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NailWorkShareGrant_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NailWorkShareGrant_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "NailWorkClientAccess" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NailWorkShareGrant_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NailWorkShareGrant_token_key" ON "NailWorkShareGrant"("token");
CREATE INDEX "NailWorkShareGrant_workId_idx" ON "NailWorkShareGrant"("workId");
CREATE INDEX "NailWorkShareGrant_accessId_revokedAt_idx" ON "NailWorkShareGrant"("accessId", "revokedAt");
CREATE INDEX "NailWorkShareGrant_expiresAt_idx" ON "NailWorkShareGrant"("expiresAt");
