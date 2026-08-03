CREATE TABLE "WechatIdentity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "appId" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "unionId" TEXT,
    "clientUserId" INTEGER,
    "technicianId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WechatIdentity_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WechatIdentity_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WechatIdentity_appId_openId_key" ON "WechatIdentity"("appId", "openId");
CREATE UNIQUE INDEX "WechatIdentity_clientUserId_key" ON "WechatIdentity"("clientUserId");
CREATE UNIQUE INDEX "WechatIdentity_technicianId_key" ON "WechatIdentity"("technicianId");
CREATE INDEX "WechatIdentity_unionId_idx" ON "WechatIdentity"("unionId");
