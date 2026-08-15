CREATE TABLE "BookingTradeOrder" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tradeNo" TEXT NOT NULL,
  "bookingId" INTEGER NOT NULL,
  "clientUserId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "totalAmount" REAL NOT NULL,
  "depositAmount" REAL NOT NULL DEFAULT 0,
  "balanceAmount" REAL NOT NULL DEFAULT 0,
  "paidAmount" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "currentPayStage" TEXT NOT NULL DEFAULT 'deposit',
  "cancelledAt" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingTradeOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BookingTradeOrder_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BookingTradeOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BookingTradeOrder_tradeNo_key" ON "BookingTradeOrder"("tradeNo");
CREATE UNIQUE INDEX "BookingTradeOrder_bookingId_key" ON "BookingTradeOrder"("bookingId");
CREATE INDEX "BookingTradeOrder_clientUserId_status_createdAt_idx" ON "BookingTradeOrder"("clientUserId", "status", "createdAt");
CREATE INDEX "BookingTradeOrder_technicianId_status_createdAt_idx" ON "BookingTradeOrder"("technicianId", "status", "createdAt");
