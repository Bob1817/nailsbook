CREATE TABLE "WechatSubscriptionAuthorization" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerKey" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "grantedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "WechatSubscriptionAuthorization_ownerKey_templateId_key"
ON "WechatSubscriptionAuthorization"("ownerKey", "templateId");

CREATE INDEX "WechatSubscriptionAuthorization_role_status_updatedAt_idx"
ON "WechatSubscriptionAuthorization"("role", "status", "updatedAt");
