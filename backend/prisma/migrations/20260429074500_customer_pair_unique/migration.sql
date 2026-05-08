DROP INDEX IF EXISTS "Customer_technicianId_clientUserId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_technicianId_clientUserId_key" ON "Customer"("technicianId", "clientUserId");
