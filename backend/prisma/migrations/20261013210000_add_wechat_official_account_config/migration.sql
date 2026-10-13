-- CreateTable
CREATE TABLE "WechatOfficialAccountConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "appId" TEXT,
    "appSecretEnc" TEXT,
    "token" TEXT,
    "encodingAesKeyEnc" TEXT,
    "encryptMode" TEXT NOT NULL DEFAULT 'plaintext',
    "welcomeReply" TEXT,
    "fallbackReply" TEXT,
    "validatedAt" DATETIME,
    "validationError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
