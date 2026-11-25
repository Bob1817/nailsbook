-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SubscriptionPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "templateCode" TEXT,
    "price" REAL NOT NULL,
    "discountPrice" REAL,
    "billingCycle" TEXT NOT NULL,
    "effectiveStartAt" DATETIME,
    "effectiveEndAt" DATETIME,
    "discountStartAt" DATETIME,
    "discountEndAt" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "maxCustomers" INTEGER,
    "maxMonthlyBookings" INTEGER,
    "maxWorks" INTEGER,
    "maxStorageBytes" REAL,
    "maxMarketingExports" INTEGER,
    "maxMonthlySms" INTEGER,
    "maxEmployees" INTEGER,
    "maxBookingPages" INTEGER,
    "targetStage" TEXT,
    "description" TEXT,
    "features" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SubscriptionPlan" ("billingCycle", "code", "createdAt", "description", "features", "id", "maxBookingPages", "maxCustomers", "maxEmployees", "maxMarketingExports", "maxMonthlyBookings", "maxMonthlySms", "maxStorageBytes", "maxWorks", "name", "price", "status", "targetStage", "updatedAt") SELECT "billingCycle", "code", "createdAt", "description", "features", "id", "maxBookingPages", "maxCustomers", "maxEmployees", "maxMarketingExports", "maxMonthlyBookings", "maxMonthlySms", "maxStorageBytes", "maxWorks", "name", "price", "status", "targetStage", "updatedAt" FROM "SubscriptionPlan";
DROP TABLE "SubscriptionPlan";
ALTER TABLE "new_SubscriptionPlan" RENAME TO "SubscriptionPlan";
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");
CREATE TABLE "new_TechnicianSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL,
    "expiredAt" DATETIME,
    "cancelledAt" DATETIME,
    "lastPaidAmountCents" INTEGER NOT NULL DEFAULT 0,
    "pendingPlanCode" TEXT,
    "changeEffectiveAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicianSubscription_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TechnicianSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TechnicianSubscription" ("cancelledAt", "changeEffectiveAt", "createdAt", "expiredAt", "id", "pendingPlanCode", "planId", "startedAt", "status", "technicianId", "updatedAt") SELECT "cancelledAt", "changeEffectiveAt", "createdAt", "expiredAt", "id", "pendingPlanCode", "planId", "startedAt", "status", "technicianId", "updatedAt" FROM "TechnicianSubscription";
DROP TABLE "TechnicianSubscription";
ALTER TABLE "new_TechnicianSubscription" RENAME TO "TechnicianSubscription";
CREATE UNIQUE INDEX "TechnicianSubscription_technicianId_key" ON "TechnicianSubscription"("technicianId");
CREATE INDEX "TechnicianSubscription_status_idx" ON "TechnicianSubscription"("status");
CREATE INDEX "TechnicianSubscription_expiredAt_idx" ON "TechnicianSubscription"("expiredAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

