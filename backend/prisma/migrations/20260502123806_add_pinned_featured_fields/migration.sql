-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NailWork" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "techId" INTEGER NOT NULL,
    "title" TEXT,
    "coverUrl" TEXT,
    "images" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWork_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NailWork" ("coverUrl", "createdAt", "description", "id", "images", "isVisible", "sortOrder", "tags", "techId", "title", "updatedAt") SELECT "coverUrl", "createdAt", "description", "id", "images", "isVisible", "sortOrder", "tags", "techId", "title", "updatedAt" FROM "NailWork";
DROP TABLE "NailWork";
ALTER TABLE "new_NailWork" RENAME TO "NailWork";
CREATE INDEX "NailWork_techId_idx" ON "NailWork"("techId");
CREATE INDEX "NailWork_isVisible_idx" ON "NailWork"("isVisible");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
