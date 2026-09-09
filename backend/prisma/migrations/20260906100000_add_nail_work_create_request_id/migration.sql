ALTER TABLE "NailWork" ADD COLUMN "createRequestId" TEXT;

CREATE UNIQUE INDEX "NailWork_createRequestId_key" ON "NailWork"("createRequestId");
