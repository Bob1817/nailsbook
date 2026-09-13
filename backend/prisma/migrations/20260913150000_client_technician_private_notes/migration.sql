CREATE TABLE "ClientTechnicianNote" ("clientId" INTEGER NOT NULL, "techId" INTEGER NOT NULL, "content" TEXT NOT NULL, "updatedAt" DATETIME NOT NULL, PRIMARY KEY ("clientId", "techId"));
