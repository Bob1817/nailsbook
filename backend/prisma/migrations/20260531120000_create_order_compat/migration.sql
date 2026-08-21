-- Historical compatibility bridge:
-- early migrations created Booking, while later application code and migrations use Order.
-- IF NOT EXISTS keeps this safe for databases where Order was previously created by db push.
CREATE TABLE IF NOT EXISTS "Order" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderNo" TEXT NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "customerId" INTEGER NOT NULL,
  "clientUserId" INTEGER,
  "addressId" INTEGER,
  "designRequestId" INTEGER,
  "customServiceRequestId" INTEGER,
  "startTime" DATETIME NOT NULL,
  "endTime" DATETIME NOT NULL,
  "address" TEXT,
  "serviceType" TEXT,
  "remark" TEXT,
  "customTitle" TEXT,
  "customDescription" TEXT,
  "customImages" TEXT,
  "reminderDaySent" BOOLEAN NOT NULL DEFAULT false,
  "reminderHourSent" BOOLEAN NOT NULL DEFAULT false,
  "quotePrice" REAL,
  "quoteRemark" TEXT,
  "quotedAt" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'pending_quote',
  "isDepositPaid" BOOLEAN NOT NULL DEFAULT false,
  "depositAmount" REAL DEFAULT 0,
  "depositStatus" TEXT DEFAULT 'pending',
  "depositConfirmedAt" DATETIME,
  "confirmedAt" DATETIME,
  "completedAt" DATETIME,
  "cancelledAt" DATETIME,
  "cancelReason" TEXT,
  "source" TEXT DEFAULT 'technician',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "ClientAddress" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Order_designRequestId_fkey" FOREIGN KEY ("designRequestId") REFERENCES "ClientDesignRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNo_key" ON "Order"("orderNo");
CREATE INDEX IF NOT EXISTS "Order_technicianId_idx" ON "Order"("technicianId");
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS "Order_clientUserId_idx" ON "Order"("clientUserId");
CREATE INDEX IF NOT EXISTS "Order_addressId_idx" ON "Order"("addressId");
CREATE INDEX IF NOT EXISTS "Order_designRequestId_idx" ON "Order"("designRequestId");
CREATE INDEX IF NOT EXISTS "Order_customServiceRequestId_idx" ON "Order"("customServiceRequestId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_startTime_idx" ON "Order"("startTime");
