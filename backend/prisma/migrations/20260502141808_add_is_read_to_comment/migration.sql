-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NailWorkComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "technicianId" INTEGER,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWorkComment_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NailWorkComment" ("clientId", "content", "createdAt", "id", "technicianId", "updatedAt", "workId") SELECT "clientId", "content", "createdAt", "id", "technicianId", "updatedAt", "workId" FROM "NailWorkComment";
DROP TABLE "NailWorkComment";
ALTER TABLE "new_NailWorkComment" RENAME TO "NailWorkComment";
CREATE INDEX "NailWorkComment_workId_idx" ON "NailWorkComment"("workId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
