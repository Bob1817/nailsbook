ALTER TABLE "Order" ADD COLUMN "sourceWorkId" INTEGER REFERENCES "NailWork"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Order_sourceWorkId_idx" ON "Order"("sourceWorkId");
