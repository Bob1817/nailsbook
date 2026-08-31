ALTER TABLE "Order" ADD COLUMN "quickBooking" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "TechnicianBookingDay" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "serviceDate" TEXT NOT NULL,
  "accepting" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "TechnicianBookingDay_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TechnicianBookingDay_technicianId_serviceDate_key" ON "TechnicianBookingDay"("technicianId", "serviceDate");
