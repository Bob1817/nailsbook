ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxWorks" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxStorageBytes" REAL;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxMarketingExports" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxMonthlySms" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxEmployees" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxBookingPages" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "targetStage" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "description" TEXT;

UPDATE "SubscriptionPlan" SET
  "maxCustomers" = 30,
  "maxMonthlyBookings" = 30,
  "maxWorks" = 50,
  "maxStorageBytes" = 524288000,
  "maxMarketingExports" = 5,
  "maxMonthlySms" = 10,
  "maxEmployees" = 1,
  "maxBookingPages" = 1,
  "targetStage" = '新手体验、个人起步',
  "description" = '免费建立完整、规范的经营流程'
WHERE "code" = 'free';

INSERT OR IGNORE INTO "SubscriptionPlan" (
  "name", "code", "price", "billingCycle", "maxCustomers",
  "maxMonthlyBookings", "maxWorks", "maxStorageBytes",
  "maxMarketingExports", "maxMonthlySms", "maxEmployees",
  "maxBookingPages", "targetStage", "description", "features",
  "status", "createdAt", "updatedAt"
) VALUES (
  '入门版', 'starter', 29, 'monthly', 150, 150, 300, 5368709120,
  30, 30, 1, 1, '稳定经营的个人美甲师', '扩大经营规模并建立个人品牌',
  '["customer_management","booking","works","branding","monthly_insights"]',
  'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO "SubscriptionPlan" (
  "name", "code", "price", "billingCycle", "maxCustomers",
  "maxMonthlyBookings", "maxWorks", "maxStorageBytes",
  "maxMarketingExports", "maxMonthlySms", "maxEmployees",
  "maxBookingPages", "targetStage", "description", "features",
  "status", "createdAt", "updatedAt"
) VALUES (
  '高阶版', 'advanced', 79, 'monthly', 500, 500, 1500, 32212254720,
  150, 100, 3, 3, '成熟美甲师、小型工作室', '提升复购率、客户价值和经营效率',
  '["customer_management","booking","works","branding","insights","full_export","smart_repurchase","customer_segmentation"]',
  'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO "SubscriptionPlan" (
  "name", "code", "price", "billingCycle", "maxCustomers",
  "maxMonthlyBookings", "maxWorks", "maxStorageBytes",
  "maxMarketingExports", "maxMonthlySms", "maxEmployees",
  "maxBookingPages", "targetStage", "description", "features",
  "status", "createdAt", "updatedAt"
) VALUES (
  '终极版', 'ultimate', 199, 'monthly', 2000, NULL, NULL, 107374182400,
  NULL, 300, 5, NULL, '多人工作室', '支持团队化和多地点经营',
  '["customer_management","booking","works","team_branding","team_insights","full_export","automation","team_management"]',
  'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

UPDATE "TechnicianSubscription"
SET "planId" = (SELECT "id" FROM "SubscriptionPlan" WHERE "code" = 'starter')
WHERE "planId" IN (SELECT "id" FROM "SubscriptionPlan" WHERE "code" IN ('pro', 'basic'));
UPDATE "TechnicianSubscription"
SET "planId" = (SELECT "id" FROM "SubscriptionPlan" WHERE "code" = 'advanced')
WHERE "planId" IN (SELECT "id" FROM "SubscriptionPlan" WHERE "code" IN ('premium', 'studio_plus'));
UPDATE "SubscriptionPlan" SET "status" = 'inactive'
WHERE "code" IN ('pro', 'basic', 'premium', 'studio_plus');

CREATE TABLE "SubscriptionResourceUsage" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "period" TEXT NOT NULL,
  "marketingExports" INTEGER NOT NULL DEFAULT 0,
  "smsSent" INTEGER NOT NULL DEFAULT 0,
  "storageBytes" REAL NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "SubscriptionResourceUsage_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SubscriptionResourceUsage_technicianId_period_key" ON "SubscriptionResourceUsage"("technicianId", "period");
CREATE INDEX "SubscriptionResourceUsage_period_idx" ON "SubscriptionResourceUsage"("period");

CREATE TABLE "SubscriptionChange" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "fromPlanCode" TEXT,
  "toPlanCode" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "effectiveAt" DATETIME NOT NULL,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionChange_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SubscriptionChange_technicianId_createdAt_idx" ON "SubscriptionChange"("technicianId", "createdAt");
CREATE INDEX "SubscriptionChange_effectiveAt_idx" ON "SubscriptionChange"("effectiveAt");
