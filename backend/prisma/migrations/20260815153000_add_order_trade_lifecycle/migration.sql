ALTER TABLE "Order" ADD COLUMN "tradeStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN "tradeCreatedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "fulfillmentStatus" TEXT;

UPDATE "Order"
SET
  "tradeCreatedAt" = COALESCE("confirmedAt", "createdAt"),
  "fulfillmentStatus" = CASE
    WHEN "serviceType" = '上门美甲' THEN 'pending_home'
    ELSE 'pending_shop'
  END,
  "tradeStatus" = CASE
    WHEN "status" = 'cancelled' THEN 'cancelled'
    WHEN "paymentStatus" = 'paid' THEN 'paid'
    WHEN "status" = 'in_progress' THEN 'balance_pending'
    WHEN "isDepositPaid" = 1 THEN 'deposit_paid'
    WHEN COALESCE("depositAmount", 0) > 0 THEN 'deposit_pending'
    ELSE 'deposit_paid'
  END
WHERE "status" IN ('pending_home', 'pending_shop', 'in_progress', 'completed', 'cancelled')
   OR "confirmedAt" IS NOT NULL;
