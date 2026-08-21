-- Add attachment URL storage to feedback records.
ALTER TABLE "Feedback" ADD COLUMN "attachmentUrls" TEXT NOT NULL DEFAULT '[]';
