ALTER TABLE "Service" ADD COLUMN "maintenanceCycleDays" INTEGER NOT NULL DEFAULT 21;
ALTER TABLE "Order" ADD COLUMN "isRepeatBooking" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "sourceServiceRecordId" INTEGER;
CREATE INDEX "Order_sourceServiceRecordId_idx" ON "Order"("sourceServiceRecordId");
