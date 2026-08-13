ALTER TABLE "ServiceReview" ADD COLUMN "verificationSource" TEXT NOT NULL DEFAULT 'completed_order';
ALTER TABLE "ServiceReview" ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "ServiceReview" ADD COLUMN "publicationStatus" TEXT NOT NULL DEFAULT 'private';
ALTER TABLE "ServiceReview" ADD COLUMN "moderatedAt" DATETIME;
ALTER TABLE "ServiceReview" ADD COLUMN "moderatorId" INTEGER;
ALTER TABLE "ServiceReview" ADD COLUMN "technicianReply" TEXT;
ALTER TABLE "ServiceReview" ADD COLUMN "repliedAt" DATETIME;
ALTER TABLE "ServiceReview" ADD COLUMN "reviewInvitationId" INTEGER;
CREATE UNIQUE INDEX "ServiceReview_reviewInvitationId_key" ON "ServiceReview"("reviewInvitationId");

CREATE TABLE "ReviewInvitation" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewInvitation_orderId_fkey" FOREIGN KEY("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReviewInvitation_technicianId_fkey" FOREIGN KEY("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReviewInvitation_orderId_key" ON "ReviewInvitation"("orderId");
CREATE UNIQUE INDEX "ReviewInvitation_tokenHash_key" ON "ReviewInvitation"("tokenHash");
CREATE INDEX "ReviewInvitation_technicianId_expiresAt_idx" ON "ReviewInvitation"("technicianId","expiresAt");
