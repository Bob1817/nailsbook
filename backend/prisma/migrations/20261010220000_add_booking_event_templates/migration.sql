ALTER TABLE "WechatPlatformConfig" ADD COLUMN "bookingClientSuccessTemplateId" TEXT;
ALTER TABLE "WechatPlatformConfig" ADD COLUMN "bookingTechnicianNewTemplateId" TEXT;

UPDATE "WechatPlatformConfig"
SET "bookingClientSuccessTemplateId" = 'UnS_YwQEI9yhQnEv2poRg3kQrzJfC5ti5fjXCNES_qY',
    "bookingTechnicianNewTemplateId" = 'UnS_YwQEI9yhQnEv2poRg_KleGknzepSet_aNnES2v4'
WHERE "id" = 1;
