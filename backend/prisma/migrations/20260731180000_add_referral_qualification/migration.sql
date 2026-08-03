ALTER TABLE "ReferralRelation" ADD COLUMN "rewardPromised" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReferralRelation" ADD COLUMN "rewardAmount" REAL;
ALTER TABLE "ReferralRelation" ADD COLUMN "minimumOrderAmount" REAL NOT NULL DEFAULT 0;

CREATE TABLE "ReferralQualification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "relationId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "paidAmount" REAL NOT NULL,
    "minimumOrderAmount" REAL NOT NULL,
    "rewardAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'qualified',
    "qualifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralQualification_relationId_fkey" FOREIGN KEY ("relationId") REFERENCES "ReferralRelation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReferralQualification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReferralQualification_relationId_key" ON "ReferralQualification"("relationId");
CREATE UNIQUE INDEX "ReferralQualification_orderId_key" ON "ReferralQualification"("orderId");
