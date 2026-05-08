-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClientTechBinding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "techId" INTEGER NOT NULL,
    "inviteCode" TEXT,
    "bindSource" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientTechBinding_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientTechBinding_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ClientTechBinding" ("bindSource", "clientId", "createdAt", "id", "inviteCode", "techId") SELECT "bindSource", "clientId", "createdAt", "id", "inviteCode", "techId" FROM "ClientTechBinding";
DROP TABLE "ClientTechBinding";
ALTER TABLE "new_ClientTechBinding" RENAME TO "ClientTechBinding";
CREATE INDEX "ClientTechBinding_techId_idx" ON "ClientTechBinding"("techId");
CREATE INDEX "ClientTechBinding_clientId_status_idx" ON "ClientTechBinding"("clientId", "status");
CREATE UNIQUE INDEX "ClientTechBinding_clientId_techId_key" ON "ClientTechBinding"("clientId", "techId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
