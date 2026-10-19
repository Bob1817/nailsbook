CREATE TABLE "BookingQuote" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "quoteNo" TEXT NOT NULL,
  "publicToken" TEXT NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "clientUserId" INTEGER,
  "customerId" INTEGER,
  "orderId" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'issued',
  "version" INTEGER NOT NULL DEFAULT 1,
  "clientName" TEXT,
  "requirement" TEXT,
  "referenceImages" TEXT,
  "serviceType" TEXT NOT NULL DEFAULT '到店美甲',
  "technicianNameSnapshot" TEXT NOT NULL,
  "technicianAvatarSnapshot" TEXT,
  "invitationCodeSnapshot" TEXT,
  "shopNameSnapshot" TEXT,
  "shopAddressSnapshot" TEXT,
  "shopLatitudeSnapshot" REAL,
  "shopLongitudeSnapshot" REAL,
  "bookingRulesSnapshot" TEXT,
  "serviceSubtotalFen" INTEGER NOT NULL DEFAULT 0,
  "materialSubtotalFen" INTEGER NOT NULL DEFAULT 0,
  "surchargeSubtotalFen" INTEGER NOT NULL DEFAULT 0,
  "discountAmountFen" INTEGER NOT NULL DEFAULT 0,
  "finalPriceFen" INTEGER NOT NULL,
  "totalDurationMinutes" INTEGER NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "viewedAt" DATETIME,
  "acceptedAt" DATETIME,
  "bookedAt" DATETIME,
  "declinedAt" DATETIME,
  "withdrawnAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingQuote_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BookingQuote_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "BookingQuote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "BookingQuote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "BookingQuoteLine" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "bookingQuoteId" INTEGER NOT NULL,
  "lineType" TEXT NOT NULL,
  "serviceId" INTEGER,
  "servicePublicIdSnapshot" TEXT,
  "nameSnapshot" TEXT NOT NULL,
  "unitPriceFen" INTEGER NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "subtotalFen" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingQuoteLine_bookingQuoteId_fkey" FOREIGN KEY ("bookingQuoteId") REFERENCES "BookingQuote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BookingQuoteLine_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BookingQuote_quoteNo_key" ON "BookingQuote"("quoteNo");
CREATE UNIQUE INDEX "BookingQuote_publicToken_key" ON "BookingQuote"("publicToken");
CREATE UNIQUE INDEX "BookingQuote_orderId_key" ON "BookingQuote"("orderId");
CREATE INDEX "BookingQuote_technicianId_status_createdAt_idx" ON "BookingQuote"("technicianId", "status", "createdAt");
CREATE INDEX "BookingQuote_clientUserId_status_idx" ON "BookingQuote"("clientUserId", "status");
CREATE INDEX "BookingQuote_expiresAt_idx" ON "BookingQuote"("expiresAt");
CREATE INDEX "BookingQuoteLine_bookingQuoteId_sortOrder_idx" ON "BookingQuoteLine"("bookingQuoteId", "sortOrder");
CREATE INDEX "BookingQuoteLine_serviceId_idx" ON "BookingQuoteLine"("serviceId");
