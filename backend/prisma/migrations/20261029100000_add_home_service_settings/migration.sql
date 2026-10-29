ALTER TABLE "Technician" ADD COLUMN "homeServiceSettings" TEXT;
ALTER TABLE "Order" ADD COLUMN "homeServiceFeeFen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "homeServiceDistanceKm" REAL;
