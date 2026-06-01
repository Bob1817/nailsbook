-- Add unique constraint on Order.confirmToken
CREATE UNIQUE INDEX "Order_confirmToken_key" ON "Order"("confirmToken");
