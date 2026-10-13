-- 公众号消息流水表：用户消息与人工回复留痕，支撑客服承接
CREATE TABLE "WechatOfficialMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "appId" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'in',
    "msgType" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL DEFAULT '',
    "mediaId" TEXT,
    "eventType" TEXT,
    "eventKey" TEXT,
    "wechatMsgId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "replyMode" TEXT,
    "repliedBy" TEXT,
    "handledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "WechatOfficialMessage_wechatMsgId_key" ON "WechatOfficialMessage"("wechatMsgId");
CREATE INDEX "WechatOfficialMessage_openId_createdAt_idx" ON "WechatOfficialMessage"("openId", "createdAt");
CREATE INDEX "WechatOfficialMessage_status_createdAt_idx" ON "WechatOfficialMessage"("status", "createdAt");
CREATE INDEX "WechatOfficialMessage_createdAt_idx" ON "WechatOfficialMessage"("createdAt");
