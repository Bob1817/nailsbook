-- AlterTable
ALTER TABLE "ServiceRecord" ADD COLUMN "preServiceNotes" TEXT;
ALTER TABLE "ServiceRecord" ADD COLUMN "clientRequests" TEXT;
ALTER TABLE "ServiceRecord" ADD COLUMN "reactionLevel" TEXT;
ALTER TABLE "ServiceRecord" ADD COLUMN "safetyConfirmedAt" DATETIME;
ALTER TABLE "ServiceRecord" ADD COLUMN "nailConditionConfirmedAt" DATETIME;

-- AlterTable
ALTER TABLE "WorkPreparation" ADD COLUMN "nailShape" TEXT;
ALTER TABLE "WorkPreparation" ADD COLUMN "nailLength" TEXT;
ALTER TABLE "WorkPreparation" ADD COLUMN "baseCondition" TEXT;
ALTER TABLE "WorkPreparation" ADD COLUMN "alternatives" TEXT;
ALTER TABLE "WorkPreparation" ADD COLUMN "failurePoints" TEXT;
ALTER TABLE "WorkPreparation" ADD COLUMN "unsuitableClients" TEXT;
ALTER TABLE "WorkPreparation" ADD COLUMN "difficulty" TEXT;
ALTER TABLE "WorkPreparation" ADD COLUMN "sourceRecordCount" INTEGER NOT NULL DEFAULT 0;
