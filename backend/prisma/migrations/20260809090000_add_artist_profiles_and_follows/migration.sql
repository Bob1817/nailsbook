ALTER TABLE "Technician" ADD COLUMN "bio" TEXT;

CREATE TABLE "TechnicianFollow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientUserId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicianFollow_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TechnicianFollow_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TechnicianFollow_clientUserId_technicianId_key" ON "TechnicianFollow"("clientUserId", "technicianId");
CREATE INDEX "TechnicianFollow_technicianId_idx" ON "TechnicianFollow"("technicianId");
