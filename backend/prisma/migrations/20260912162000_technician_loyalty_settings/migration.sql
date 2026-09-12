ALTER TABLE "Technician" ADD COLUMN "loyaltySettings" TEXT;
ALTER TABLE "ClientTechBinding" ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;
