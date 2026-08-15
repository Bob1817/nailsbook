ALTER TABLE "Order" ADD COLUMN "attributionCampaign" TEXT;
ALTER TABLE "Order" ADD COLUMN "attributionChannel" TEXT DEFAULT 'direct';
ALTER TABLE "Order" ADD COLUMN "attributionContent" TEXT;
ALTER TABLE "Order" ADD COLUMN "attributionVisitorId" TEXT;
