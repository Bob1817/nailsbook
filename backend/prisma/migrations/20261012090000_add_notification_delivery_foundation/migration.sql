ALTER TABLE "WechatSubscriptionAuthorization" ADD COLUMN "availableCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WechatSubscriptionAuthorization" ADD COLUMN "acceptedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WechatSubscriptionAuthorization" ADD COLUMN "consumedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WechatSubscriptionAuthorization" ADD COLUMN "lastAcceptedAt" DATETIME;
ALTER TABLE "WechatSubscriptionAuthorization" ADD COLUMN "lastConsumedAt" DATETIME;
ALTER TABLE "WechatSubscriptionAuthorization" ADD COLUMN "lastErrorCode" TEXT;
ALTER TABLE "WechatSubscriptionAuthorization" ADD COLUMN "lastErrorMessage" TEXT;

CREATE TABLE "NotificationEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "recipientRole" TEXT NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "conversationId" INTEGER,
    "messageId" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "payloadSnapshot" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "NotificationEvent_eventKey_key" ON "NotificationEvent"("eventKey");
CREATE INDEX "NotificationEvent_recipientRole_recipientId_status_availableAt_idx" ON "NotificationEvent"("recipientRole", "recipientId", "status", "availableAt");
CREATE INDEX "NotificationEvent_orderId_eventType_idx" ON "NotificationEvent"("orderId", "eventType");
CREATE INDEX "NotificationEvent_conversationId_status_idx" ON "NotificationEvent"("conversationId", "status");

CREATE TABLE "NotificationDelivery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notificationEventId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME,
    "providerCode" TEXT,
    "providerMessage" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationDelivery_notificationEventId_fkey" FOREIGN KEY ("notificationEventId") REFERENCES "NotificationEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "NotificationDelivery_dedupeKey_key" ON "NotificationDelivery"("dedupeKey");
CREATE INDEX "NotificationDelivery_status_updatedAt_idx" ON "NotificationDelivery"("status", "updatedAt");
CREATE INDEX "NotificationDelivery_notificationEventId_channel_idx" ON "NotificationDelivery"("notificationEventId", "channel");
