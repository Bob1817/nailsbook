ALTER TABLE "WechatPlatformConfig" ADD COLUMN "paymentVerifierMode" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "platformKeyId" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "platformPublicKey" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "boundAppId" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "bindingConfirmed" BOOLEAN NOT NULL DEFAULT false;
