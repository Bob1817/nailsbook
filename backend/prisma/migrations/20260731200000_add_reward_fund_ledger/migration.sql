CREATE TABLE "RewardAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "clientUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardAccount_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RewardAccount_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RewardLedger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "entryType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "reversalOfId" INTEGER,
    "availableAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardLedger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "RewardAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RewardLedger_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "RewardLedger" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RewardAccount_technicianId_clientUserId_key" ON "RewardAccount"("technicianId", "clientUserId");
CREATE INDEX "RewardAccount_clientUserId_idx" ON "RewardAccount"("clientUserId");
CREATE UNIQUE INDEX "RewardLedger_sourceType_sourceId_entryType_key" ON "RewardLedger"("sourceType", "sourceId", "entryType");
CREATE INDEX "RewardLedger_accountId_status_expiresAt_idx" ON "RewardLedger"("accountId", "status", "expiresAt");
