CREATE TABLE "WechatPlatformConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "loginEnabled" BOOLEAN NOT NULL DEFAULT false,
    "miniProgramAppId" TEXT,
    "miniProgramSecret" TEXT,
    "loginValidatedAt" DATETIME,
    "loginValidationError" TEXT,
    "paymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "merchantId" TEXT,
    "merchantSerialNo" TEXT,
    "merchantPrivateKey" TEXT,
    "apiV3Key" TEXT,
    "paymentNotifyUrl" TEXT,
    "paymentValidatedAt" DATETIME,
    "paymentValidationError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
