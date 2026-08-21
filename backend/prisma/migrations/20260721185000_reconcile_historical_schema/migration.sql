-- DropIndex
DROP INDEX "Booking_startTime_idx";

-- DropIndex
DROP INDEX "Booking_status_idx";

-- DropIndex
DROP INDEX "Booking_designRequestId_idx";

-- DropIndex
DROP INDEX "Booking_addressId_idx";

-- DropIndex
DROP INDEX "Booking_clientUserId_idx";

-- DropIndex
DROP INDEX "Booking_customerId_idx";

-- DropIndex
DROP INDEX "Booking_technicianId_idx";

-- DropIndex
DROP INDEX "Booking_quoteId_idx";

-- DropIndex
DROP INDEX "Booking_quoteId_key";

-- DropIndex
DROP INDEX "Booking_bookingNo_key";

-- DropIndex
DROP INDEX "Quote_createdAt_idx";

-- DropIndex
DROP INDEX "Quote_status_idx";

-- DropIndex
DROP INDEX "Quote_customerId_idx";

-- DropIndex
DROP INDEX "Quote_technicianId_idx";

-- DropIndex
DROP INDEX "Quote_quoteNo_key";

-- AlterTable
ALTER TABLE "ClientTechBinding" ADD COLUMN "note" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Booking";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Quote";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CustomServiceRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestNo" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "techId" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "images" TEXT,
    "referenceWorkIds" TEXT,
    "serviceDate" TEXT,
    "startTime" TEXT,
    "serviceType" TEXT,
    "addressId" INTEGER,
    "shopAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_quote',
    "quotePrice" REAL,
    "quoteRemark" TEXT,
    "quotedAt" DATETIME,
    "acceptedAt" DATETIME,
    "rejectedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomServiceRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomServiceRequest_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomServiceRequest_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "ClientAddress" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArtistApplication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "serviceMode" TEXT,
    "experience" TEXT,
    "specialty" TEXT,
    "wechat" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" INTEGER,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TechnicianInviteKey" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "note" TEXT,
    "usedByTechnicianId" INTEGER,
    "usedAt" DATETIME,
    "createdByAdminId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicianInviteKey_usedByTechnicianId_fkey" FOREIGN KEY ("usedByTechnicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NailWorkReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "commentId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "reporterType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWorkReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "NailWorkComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "clientUserId" INTEGER,
    "technicianId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "realName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "roleId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AdminRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AdminUser" ("createdAt", "email", "id", "lastLoginAt", "passwordHash", "phone", "realName", "roleId", "status", "updatedAt", "username") SELECT "createdAt", "email", "id", "lastLoginAt", "passwordHash", "phone", "realName", "roleId", "status", "updatedAt", "username" FROM "AdminUser";
DROP TABLE "AdminUser";
ALTER TABLE "new_AdminUser" RENAME TO "AdminUser";
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
CREATE TABLE "new_ClientUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nickname" TEXT,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "avatarUrl" TEXT,
    "city" TEXT,
    "bio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ClientUser" ("avatarUrl", "createdAt", "id", "nickname", "phone", "status", "updatedAt") SELECT "avatarUrl", "createdAt", "id", "nickname", "phone", "status", "updatedAt" FROM "ClientUser";
DROP TABLE "ClientUser";
ALTER TABLE "new_ClientUser" RENAME TO "ClientUser";
CREATE UNIQUE INDEX "ClientUser_phone_key" ON "ClientUser"("phone");
CREATE TABLE "new_NailWork" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "techId" INTEGER NOT NULL,
    "title" TEXT,
    "coverUrl" TEXT,
    "images" TEXT,
    "description" TEXT,
    "designIdea" TEXT,
    "suitableScene" TEXT,
    "recommendationScore" INTEGER,
    "tags" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "price" REAL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isHomepageFeatured" BOOLEAN NOT NULL DEFAULT false,
    "visibilityScope" TEXT NOT NULL DEFAULT 'public',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWork_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NailWork" ("coverUrl", "createdAt", "description", "designIdea", "id", "images", "isFeatured", "isPinned", "isVisible", "price", "recommendationScore", "sortOrder", "suitableScene", "tags", "techId", "title", "updatedAt", "viewCount", "visibilityScope") SELECT "coverUrl", "createdAt", "description", "designIdea", "id", "images", "isFeatured", "isPinned", "isVisible", "price", "recommendationScore", "sortOrder", "suitableScene", "tags", "techId", "title", "updatedAt", "viewCount", "visibilityScope" FROM "NailWork";
DROP TABLE "NailWork";
ALTER TABLE "new_NailWork" RENAME TO "NailWork";
CREATE INDEX "NailWork_techId_idx" ON "NailWork"("techId");
CREATE INDEX "NailWork_isVisible_idx" ON "NailWork"("isVisible");
CREATE INDEX "NailWork_isHomepageFeatured_idx" ON "NailWork"("isHomepageFeatured");
CREATE TABLE "new_NailWorkComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "technicianId" INTEGER,
    "parentId" INTEGER,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWorkComment_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NailWorkComment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NailWorkComment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NailWorkComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NailWorkComment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NailWorkComment" ("clientId", "content", "createdAt", "id", "isRead", "technicianId", "updatedAt", "workId") SELECT "clientId", "content", "createdAt", "id", "isRead", "technicianId", "updatedAt", "workId" FROM "NailWorkComment";
DROP TABLE "NailWorkComment";
ALTER TABLE "new_NailWorkComment" RENAME TO "NailWorkComment";
CREATE INDEX "NailWorkComment_workId_idx" ON "NailWorkComment"("workId");
CREATE INDEX "NailWorkComment_parentId_idx" ON "NailWorkComment"("parentId");
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNo" TEXT NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "clientUserId" INTEGER,
    "addressId" INTEGER,
    "designRequestId" INTEGER,
    "customServiceRequestId" INTEGER,
    "sourceWorkId" INTEGER,
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
    "confirmToken" TEXT,
    "confirmTokenExpiresAt" DATETIME,
    "confirmTokenUsedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending_quote',
    "isDepositPaid" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" REAL DEFAULT 0,
    "depositStatus" TEXT DEFAULT 'pending',
    "depositConfirmedAt" DATETIME,
    "confirmedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "expiredAt" DATETIME,
    "expiredFromStatus" TEXT,
    "source" TEXT DEFAULT 'technician',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "ClientAddress" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_designRequestId_fkey" FOREIGN KEY ("designRequestId") REFERENCES "ClientDesignRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_customServiceRequestId_fkey" FOREIGN KEY ("customServiceRequestId") REFERENCES "CustomServiceRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_sourceWorkId_fkey" FOREIGN KEY ("sourceWorkId") REFERENCES "NailWork" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("address", "addressId", "cancelReason", "cancelledAt", "clientUserId", "completedAt", "confirmToken", "confirmTokenExpiresAt", "confirmTokenUsedAt", "confirmedAt", "createdAt", "customDescription", "customImages", "customServiceRequestId", "customTitle", "customerId", "depositAmount", "depositConfirmedAt", "depositStatus", "designRequestId", "endTime", "id", "isDepositPaid", "orderNo", "quotePrice", "quoteRemark", "quotedAt", "remark", "reminderDaySent", "reminderHourSent", "serviceType", "source", "sourceWorkId", "startTime", "status", "technicianId", "updatedAt") SELECT "address", "addressId", "cancelReason", "cancelledAt", "clientUserId", "completedAt", "confirmToken", "confirmTokenExpiresAt", "confirmTokenUsedAt", "confirmedAt", "createdAt", "customDescription", "customImages", "customServiceRequestId", "customTitle", "customerId", "depositAmount", "depositConfirmedAt", "depositStatus", "designRequestId", "endTime", "id", "isDepositPaid", "orderNo", "quotePrice", "quoteRemark", "quotedAt", "remark", "reminderDaySent", "reminderHourSent", "serviceType", "source", "sourceWorkId", "startTime", "status", "technicianId", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");
CREATE UNIQUE INDEX "Order_confirmToken_key" ON "Order"("confirmToken");
CREATE INDEX "Order_technicianId_idx" ON "Order"("technicianId");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_clientUserId_idx" ON "Order"("clientUserId");
CREATE INDEX "Order_addressId_idx" ON "Order"("addressId");
CREATE INDEX "Order_designRequestId_idx" ON "Order"("designRequestId");
CREATE INDEX "Order_customServiceRequestId_idx" ON "Order"("customServiceRequestId");
CREATE INDEX "Order_sourceWorkId_idx" ON "Order"("sourceWorkId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_startTime_idx" ON "Order"("startTime");
CREATE TABLE "new_Revenue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "revenueNo" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "recognizedAt" DATETIME NOT NULL,
    "voidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Revenue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Revenue_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Revenue_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Revenue" ("amount", "createdAt", "customerId", "id", "recognizedAt", "revenueNo", "status", "technicianId", "updatedAt", "voidedAt") SELECT "amount", "createdAt", "customerId", "id", "recognizedAt", "revenueNo", "status", "technicianId", "updatedAt", "voidedAt" FROM "Revenue";
DROP TABLE "Revenue";
ALTER TABLE "new_Revenue" RENAME TO "Revenue";
CREATE UNIQUE INDEX "Revenue_revenueNo_key" ON "Revenue"("revenueNo");
CREATE UNIQUE INDEX "Revenue_orderId_key" ON "Revenue"("orderId");
CREATE INDEX "Revenue_technicianId_idx" ON "Revenue"("technicianId");
CREATE INDEX "Revenue_customerId_idx" ON "Revenue"("customerId");
CREATE INDEX "Revenue_recognizedAt_idx" ON "Revenue"("recognizedAt");
CREATE TABLE "new_Technician" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "city" TEXT,
    "province" TEXT,
    "serviceArea" TEXT,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "invitationCode" TEXT,
    "invitedAt" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "homeService" BOOLEAN NOT NULL DEFAULT false,
    "shopService" BOOLEAN NOT NULL DEFAULT false,
    "shopAddresses" TEXT,
    "serviceItems" TEXT,
    "homeServiceRadius" REAL,
    "homeServicePricing" TEXT,
    "nightServiceFee" REAL,
    "holidayServiceFee" REAL,
    "minOrderAmount" REAL,
    "socialMedia" TEXT,
    "serviceSchedule" TEXT,
    "customTags" TEXT
);
INSERT INTO "new_Technician" ("avatarUrl", "city", "createdAt", "holidayServiceFee", "homeService", "homeServicePricing", "homeServiceRadius", "id", "invitationCode", "invitedAt", "lastLoginAt", "minOrderAmount", "mustChangePassword", "name", "nightServiceFee", "phone", "serviceArea", "serviceItems", "shopAddresses", "shopService", "status", "updatedAt") SELECT "avatarUrl", "city", "createdAt", "holidayServiceFee", "homeService", "homeServicePricing", "homeServiceRadius", "id", "invitationCode", "invitedAt", "lastLoginAt", "minOrderAmount", "mustChangePassword", "name", "nightServiceFee", "phone", "serviceArea", "serviceItems", "shopAddresses", "shopService", "status", "updatedAt" FROM "Technician";
DROP TABLE "Technician";
ALTER TABLE "new_Technician" RENAME TO "Technician";
CREATE UNIQUE INDEX "Technician_phone_key" ON "Technician"("phone");
CREATE UNIQUE INDEX "Technician_invitationCode_key" ON "Technician"("invitationCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CustomServiceRequest_requestNo_key" ON "CustomServiceRequest"("requestNo");

-- CreateIndex
CREATE INDEX "CustomServiceRequest_clientId_idx" ON "CustomServiceRequest"("clientId");

-- CreateIndex
CREATE INDEX "CustomServiceRequest_techId_idx" ON "CustomServiceRequest"("techId");

-- CreateIndex
CREATE INDEX "CustomServiceRequest_status_idx" ON "CustomServiceRequest"("status");

-- CreateIndex
CREATE INDEX "CustomServiceRequest_createdAt_idx" ON "CustomServiceRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ArtistApplication_status_idx" ON "ArtistApplication"("status");

-- CreateIndex
CREATE INDEX "ArtistApplication_phone_idx" ON "ArtistApplication"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianInviteKey_key_key" ON "TechnicianInviteKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianInviteKey_usedByTechnicianId_key" ON "TechnicianInviteKey"("usedByTechnicianId");

-- CreateIndex
CREATE INDEX "TechnicianInviteKey_usedByTechnicianId_idx" ON "TechnicianInviteKey"("usedByTechnicianId");

-- CreateIndex
CREATE INDEX "NailWorkReport_status_idx" ON "NailWorkReport"("status");

-- CreateIndex
CREATE INDEX "NailWorkReport_commentId_idx" ON "NailWorkReport"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "NailWorkReport_commentId_reporterId_reporterType_key" ON "NailWorkReport"("commentId", "reporterId", "reporterType");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_clientUserId_idx" ON "DeviceToken"("clientUserId");

-- CreateIndex
CREATE INDEX "DeviceToken_technicianId_idx" ON "DeviceToken"("technicianId");
