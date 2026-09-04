CREATE TABLE "AccountDeletionRequest" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "accountType" TEXT NOT NULL,
 "accountId" INTEGER NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'pending',
 "reason" TEXT NOT NULL,
 "decision" TEXT,
 "reviewerId" INTEGER,
 "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "processedAt" DATETIME,
 "events" TEXT NOT NULL DEFAULT '[]',
 "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "AccountDeletionRequest_accountType_accountId_key" ON "AccountDeletionRequest"("accountType", "accountId");
CREATE INDEX "AccountDeletionRequest_status_requestedAt_idx" ON "AccountDeletionRequest"("status", "requestedAt");
