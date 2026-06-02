-- CreateTable
CREATE TABLE "AdminUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "realName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "roleId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AdminRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminRole" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AdminPermission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AdminRolePermission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AdminRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AdminRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "AdminPermission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "avatarUrl" TEXT,
    "city" TEXT,
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
    "socialMedia" TEXT,
    "serviceSchedule" TEXT,
    "customTags" TEXT
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "clientUserId" INTEGER,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "gender" TEXT,
    "birthday" DATETIME,
    "address" TEXT,
    "tags" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Customer_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
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
    "source" TEXT DEFAULT 'technician',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "ClientAddress" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_designRequestId_fkey" FOREIGN KEY ("designRequestId") REFERENCES "ClientDesignRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_customServiceRequestId_fkey" FOREIGN KEY ("customServiceRequestId") REFERENCES "CustomServiceRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientUser" (
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

-- CreateTable
CREATE TABLE "ClientTechBinding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "techId" INTEGER NOT NULL,
    "inviteCode" TEXT,
    "bindSource" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWork_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NailWorkLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "technicianId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWorkLike_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NailWorkFavorite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "technicianId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NailWorkFavorite_workId_fkey" FOREIGN KEY ("workId") REFERENCES "NailWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NailWorkComment" (
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

-- CreateTable
CREATE TABLE "Revenue" (
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

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "maxCustomers" INTEGER,
    "maxMonthlyBookings" INTEGER,
    "features" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TechnicianSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL,
    "expiredAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicianSubscription_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TechnicianSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "featureCode" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabledPlans" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OperationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "adminUserId" INTEGER NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" INTEGER,
    "beforeData" TEXT,
    "afterData" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRole_code_key" ON "AdminRole"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPermission_code_key" ON "AdminPermission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRolePermission_roleId_permissionId_key" ON "AdminRolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_phone_key" ON "Technician"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_invitationCode_key" ON "Technician"("invitationCode");

-- CreateIndex
CREATE INDEX "Customer_technicianId_idx" ON "Customer"("technicianId");

-- CreateIndex
CREATE INDEX "Customer_clientUserId_idx" ON "Customer"("clientUserId");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_technicianId_clientUserId_key" ON "Customer"("technicianId", "clientUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");

-- CreateIndex
CREATE INDEX "Order_technicianId_idx" ON "Order"("technicianId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_clientUserId_idx" ON "Order"("clientUserId");

-- CreateIndex
CREATE INDEX "Order_addressId_idx" ON "Order"("addressId");

-- CreateIndex
CREATE INDEX "Order_designRequestId_idx" ON "Order"("designRequestId");

-- CreateIndex
CREATE INDEX "Order_customServiceRequestId_idx" ON "Order"("customServiceRequestId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_startTime_idx" ON "Order"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "ClientUser_phone_key" ON "ClientUser"("phone");

-- CreateIndex
CREATE INDEX "ClientTechBinding_techId_idx" ON "ClientTechBinding"("techId");

-- CreateIndex
CREATE INDEX "ClientTechBinding_clientId_status_idx" ON "ClientTechBinding"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTechBinding_clientId_techId_key" ON "ClientTechBinding"("clientId", "techId");

-- CreateIndex
CREATE INDEX "ClientAddress_clientId_idx" ON "ClientAddress"("clientId");

-- CreateIndex
CREATE INDEX "NailWork_techId_idx" ON "NailWork"("techId");

-- CreateIndex
CREATE INDEX "NailWork_isVisible_idx" ON "NailWork"("isVisible");

-- CreateIndex
CREATE INDEX "NailWorkLike_workId_idx" ON "NailWorkLike"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "NailWorkLike_workId_clientId_technicianId_key" ON "NailWorkLike"("workId", "clientId", "technicianId");

-- CreateIndex
CREATE INDEX "NailWorkFavorite_workId_idx" ON "NailWorkFavorite"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "NailWorkFavorite_workId_clientId_technicianId_key" ON "NailWorkFavorite"("workId", "clientId", "technicianId");

-- CreateIndex
CREATE INDEX "NailWorkComment_workId_idx" ON "NailWorkComment"("workId");

-- CreateIndex
CREATE INDEX "NailWorkComment_parentId_idx" ON "NailWorkComment"("parentId");

-- CreateIndex
CREATE INDEX "ClientDesignRequest_clientId_idx" ON "ClientDesignRequest"("clientId");

-- CreateIndex
CREATE INDEX "ClientDesignRequest_techId_idx" ON "ClientDesignRequest"("techId");

-- CreateIndex
CREATE INDEX "ClientDesignRequest_status_idx" ON "ClientDesignRequest"("status");

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
CREATE INDEX "Conversation_techId_idx" ON "Conversation"("techId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_clientId_techId_key" ON "Conversation"("clientId", "techId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Revenue_revenueNo_key" ON "Revenue"("revenueNo");

-- CreateIndex
CREATE UNIQUE INDEX "Revenue_orderId_key" ON "Revenue"("orderId");

-- CreateIndex
CREATE INDEX "Revenue_technicianId_idx" ON "Revenue"("technicianId");

-- CreateIndex
CREATE INDEX "Revenue_customerId_idx" ON "Revenue"("customerId");

-- CreateIndex
CREATE INDEX "Revenue_recognizedAt_idx" ON "Revenue"("recognizedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianSubscription_technicianId_key" ON "TechnicianSubscription"("technicianId");

-- CreateIndex
CREATE INDEX "TechnicianSubscription_status_idx" ON "TechnicianSubscription"("status");

-- CreateIndex
CREATE INDEX "TechnicianSubscription_expiredAt_idx" ON "TechnicianSubscription"("expiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_featureCode_key" ON "FeatureFlag"("featureCode");

-- CreateIndex
CREATE INDEX "OperationLog_adminUserId_idx" ON "OperationLog"("adminUserId");

-- CreateIndex
CREATE INDEX "OperationLog_module_idx" ON "OperationLog"("module");

-- CreateIndex
CREATE INDEX "OperationLog_targetType_targetId_idx" ON "OperationLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "OperationLog_createdAt_idx" ON "OperationLog"("createdAt");

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

