-- Add price column to NailWork
ALTER TABLE "NailWork" ADD COLUMN "price" REAL;

-- Create BlockedTimeSlot table
CREATE TABLE IF NOT EXISTS "BlockedTimeSlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "techId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockedTimeSlot_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "BlockedTimeSlot_techId_idx" ON "BlockedTimeSlot"("techId");
CREATE INDEX "BlockedTimeSlot_startTime_idx" ON "BlockedTimeSlot"("startTime");
CREATE INDEX "BlockedTimeSlot_endTime_idx" ON "BlockedTimeSlot"("endTime");
