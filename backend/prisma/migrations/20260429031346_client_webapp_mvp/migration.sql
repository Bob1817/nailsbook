-- CreateTable
CREATE TABLE "ClientUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nickname" TEXT,
    "phone" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ClientTechBinding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "techId" INTEGER NOT NULL,
    "inviteCode" TEXT,
    "bindSource" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientTechBinding_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientTechBinding_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientAddress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "detailAddress" TEXT,
    "doorInfo" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientAddress_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NailWork" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "techId" INTEGER NOT NULL,
    "title" TEXT,
    "coverUrl" TEXT,
    "images" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWork_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientDesignRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "techId" INTEGER NOT NULL,
    "title" TEXT,
    "images" TEXT,
    "description" TEXT,
    "quotePrice" REAL,
    "quoteRemark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_quote',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientDesignRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientDesignRequest_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "techId" INTEGER NOT NULL,
    "lastMessage" TEXT,
    "lastMessageAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Conversation_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversationId" INTEGER NOT NULL,
    "senderType" TEXT,
    "senderId" INTEGER,
    "receiverType" TEXT,
    "receiverId" INTEGER,
    "messageType" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "relatedType" TEXT,
    "relatedId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookingNo" TEXT NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "clientUserId" INTEGER,
    "addressId" INTEGER,
    "designRequestId" INTEGER,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "address" TEXT,
    "serviceType" TEXT,
    "remark" TEXT,
    "quotePrice" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending_confirm',
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
    CONSTRAINT "Booking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "ClientAddress" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_designRequestId_fkey" FOREIGN KEY ("designRequestId") REFERENCES "ClientDesignRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("address", "bookingNo", "cancelReason", "cancelledAt", "completedAt", "confirmedAt", "createdAt", "customerId", "depositConfirmedAt", "endTime", "id", "isDepositPaid", "quoteId", "startTime", "status", "technicianId", "updatedAt") SELECT "address", "bookingNo", "cancelReason", "cancelledAt", "completedAt", "confirmedAt", "createdAt", "customerId", "depositConfirmedAt", "endTime", "id", "isDepositPaid", "quoteId", "startTime", "status", "technicianId", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_bookingNo_key" ON "Booking"("bookingNo");
CREATE UNIQUE INDEX "Booking_quoteId_key" ON "Booking"("quoteId");
CREATE INDEX "Booking_quoteId_idx" ON "Booking"("quoteId");
CREATE INDEX "Booking_technicianId_idx" ON "Booking"("technicianId");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_clientUserId_idx" ON "Booking"("clientUserId");
CREATE INDEX "Booking_addressId_idx" ON "Booking"("addressId");
CREATE INDEX "Booking_designRequestId_idx" ON "Booking"("designRequestId");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_startTime_idx" ON "Booking"("startTime");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ClientUser_phone_key" ON "ClientUser"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTechBinding_clientId_key" ON "ClientTechBinding"("clientId");

-- CreateIndex
CREATE INDEX "ClientTechBinding_techId_idx" ON "ClientTechBinding"("techId");

-- CreateIndex
CREATE INDEX "ClientAddress_clientId_idx" ON "ClientAddress"("clientId");

-- CreateIndex
CREATE INDEX "NailWork_techId_idx" ON "NailWork"("techId");

-- CreateIndex
CREATE INDEX "NailWork_isVisible_idx" ON "NailWork"("isVisible");

-- CreateIndex
CREATE INDEX "ClientDesignRequest_clientId_idx" ON "ClientDesignRequest"("clientId");

-- CreateIndex
CREATE INDEX "ClientDesignRequest_techId_idx" ON "ClientDesignRequest"("techId");

-- CreateIndex
CREATE INDEX "ClientDesignRequest_status_idx" ON "ClientDesignRequest"("status");

-- CreateIndex
CREATE INDEX "Conversation_techId_idx" ON "Conversation"("techId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_clientId_techId_key" ON "Conversation"("clientId", "techId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
