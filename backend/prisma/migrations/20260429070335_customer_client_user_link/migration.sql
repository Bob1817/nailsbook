-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "clientUserId" INTEGER,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "gender" TEXT,
    "birthday" DATETIME,
    "address" TEXT,
    "tags" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Customer_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "avatarUrl", "birthday", "createdAt", "gender", "id", "name", "notes", "phone", "tags", "technicianId", "updatedAt") SELECT "address", "avatarUrl", "birthday", "createdAt", "gender", "id", "name", "notes", "phone", "tags", "technicianId", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_technicianId_idx" ON "Customer"("technicianId");
CREATE INDEX "Customer_clientUserId_idx" ON "Customer"("clientUserId");
CREATE INDEX "Customer_technicianId_clientUserId_idx" ON "Customer"("technicianId", "clientUserId");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
