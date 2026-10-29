-- 作品封面原始尺寸，供客户端按真实宽高比渲染作品卡
ALTER TABLE "NailWork" ADD COLUMN "coverWidth" INTEGER;
ALTER TABLE "NailWork" ADD COLUMN "coverHeight" INTEGER;
