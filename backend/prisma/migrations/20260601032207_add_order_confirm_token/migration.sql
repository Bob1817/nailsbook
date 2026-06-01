-- Add confirm token fields to Order model
ALTER TABLE "Order" ADD COLUMN "confirmToken" TEXT;
ALTER TABLE "Order" ADD COLUMN "confirmTokenExpiresAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "confirmTokenUsedAt" DATETIME;