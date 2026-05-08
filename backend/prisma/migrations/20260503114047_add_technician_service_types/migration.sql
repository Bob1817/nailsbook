-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Technician" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "city" TEXT,
    "serviceArea" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitationCode" TEXT,
    "invitedAt" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "homeService" BOOLEAN NOT NULL DEFAULT false,
    "shopService" BOOLEAN NOT NULL DEFAULT false,
    "shopAddresses" TEXT
);
INSERT INTO "new_Technician" ("avatarUrl", "city", "createdAt", "id", "invitationCode", "invitedAt", "lastLoginAt", "name", "phone", "serviceArea", "status", "updatedAt") SELECT "avatarUrl", "city", "createdAt", "id", "invitationCode", "invitedAt", "lastLoginAt", "name", "phone", "serviceArea", "status", "updatedAt" FROM "Technician";
DROP TABLE "Technician";
ALTER TABLE "new_Technician" RENAME TO "Technician";
CREATE UNIQUE INDEX "Technician_phone_key" ON "Technician"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
