-- Feedback existed in databases previously synchronized with db push, but had no
-- creation migration before the attachment column migration.
CREATE TABLE IF NOT EXISTS "Feedback" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "sourceType" TEXT NOT NULL,
  "sourceId" INTEGER NOT NULL,
  "sourceName" TEXT,
  "sourcePhone" TEXT,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Feedback_status_idx" ON "Feedback"("status");
CREATE INDEX IF NOT EXISTS "Feedback_sourceType_idx" ON "Feedback"("sourceType");
