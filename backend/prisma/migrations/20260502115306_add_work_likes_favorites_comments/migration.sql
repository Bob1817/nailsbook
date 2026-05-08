-- CreateTable
CREATE TABLE "NailWorkLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "technicianId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWorkLike_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NailWorkFavorite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "technicianId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWorkFavorite_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NailWorkComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "technicianId" INTEGER,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWorkComment_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NailWorkLike_workId_idx" ON "NailWorkLike"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "NailWorkLike_workId_clientId_technicianId_key" ON "NailWorkLike"("workId", "clientId", "technicianId");

-- CreateIndex
CREATE INDEX "NailWorkFavorite_workId_idx" ON "NailWorkFavorite"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "NailWorkFavorite_workId_clientId_technicianId_key" ON "NailWorkFavorite"("workId", "clientId", "technicianId");

-- CreateIndex
CREATE INDEX "NailWorkComment_workId_idx" ON "NailWorkComment"("workId");
