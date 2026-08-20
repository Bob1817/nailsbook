-- SQLite only supports adding one column per ALTER TABLE statement.
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "operatorName" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "storeName" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "storeAddress" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "storePhone" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "privacyContact" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "filingNumber" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "launchTechnicianId" INTEGER;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "bookingReminderTemplateId" TEXT;
