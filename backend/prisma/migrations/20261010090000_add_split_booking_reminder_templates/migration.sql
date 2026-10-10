ALTER TABLE "WechatPlatformConfig" ADD COLUMN "bookingDayBeforeTemplateId" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "bookingHourBeforeTemplateId" TEXT;

UPDATE "WechatPlatformConfig"
SET "bookingDayBeforeTemplateId" = "bookingReminderTemplateId"
WHERE "bookingDayBeforeTemplateId" IS NULL
  AND "bookingReminderTemplateId" IS NOT NULL;
