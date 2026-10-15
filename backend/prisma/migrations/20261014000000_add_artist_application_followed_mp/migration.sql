-- 入驻申请新增可选的公众号关注状态，供超管审批时参考
ALTER TABLE "ArtistApplication" ADD COLUMN "followedMp" BOOLEAN NOT NULL DEFAULT false;
