ALTER TABLE "Customer" ADD COLUMN "archivedAt" DATETIME;
CREATE INDEX "Customer_technicianId_archivedAt_idx" ON "Customer"("technicianId", "archivedAt");
