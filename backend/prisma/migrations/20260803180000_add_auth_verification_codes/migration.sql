CREATE TABLE "AuthVerificationCode" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuthVerificationCode_expiresAt_idx" ON "AuthVerificationCode"("expiresAt");

CREATE TABLE "AuthVerificationRateLimit" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resetAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuthVerificationRateLimit_resetAt_idx" ON "AuthVerificationRateLimit"("resetAt");
