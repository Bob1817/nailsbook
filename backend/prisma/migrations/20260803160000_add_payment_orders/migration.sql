ALTER TABLE "Order" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE "Order" ADD COLUMN "paidAmount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "paidAt" DATETIME;

CREATE TABLE "PaymentOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paymentNo" TEXT NOT NULL,
    "orderId" INTEGER,
    "subscriptionId" INTEGER,
    "clientUserId" INTEGER,
    "technicianId" INTEGER,
    "paymentType" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'wechat',
    "status" TEXT NOT NULL DEFAULT 'created',
    "idempotencyKey" TEXT NOT NULL,
    "providerTradeNo" TEXT,
    "failureReason" TEXT,
    "providerPayload" TEXT,
    "paidAt" DATETIME,
    "closedAt" DATETIME,
    "refundedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentOrder_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "TechnicianSubscription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentOrder_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentOrder_paymentNo_key" ON "PaymentOrder"("paymentNo");
CREATE UNIQUE INDEX "PaymentOrder_idempotencyKey_key" ON "PaymentOrder"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentOrder_providerTradeNo_key" ON "PaymentOrder"("providerTradeNo");
CREATE INDEX "PaymentOrder_orderId_paymentType_status_idx" ON "PaymentOrder"("orderId", "paymentType", "status");
CREATE INDEX "PaymentOrder_subscriptionId_status_idx" ON "PaymentOrder"("subscriptionId", "status");
CREATE INDEX "PaymentOrder_clientUserId_createdAt_idx" ON "PaymentOrder"("clientUserId", "createdAt");
CREATE INDEX "PaymentOrder_technicianId_createdAt_idx" ON "PaymentOrder"("technicianId", "createdAt");
