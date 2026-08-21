ALTER TABLE "NailWork" ADD COLUMN "sourceOrderId" INTEGER;
CREATE UNIQUE INDEX "NailWork_sourceOrderId_key" ON "NailWork"("sourceOrderId");
