CREATE TABLE "ActionTask" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "taskKey" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "relatedType" TEXT NOT NULL,
  "relatedId" INTEGER NOT NULL,
  "actionPath" TEXT NOT NULL,
  "dueAt" DATETIME,
  "remindAt" DATETIME,
  "resolvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionTask_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ActionTask_taskKey_key" ON "ActionTask"("taskKey");
CREATE INDEX "ActionTask_technicianId_status_dueAt_idx" ON "ActionTask"("technicianId","status","dueAt");
CREATE INDEX "ActionTask_technicianId_type_relatedId_idx" ON "ActionTask"("technicianId","type","relatedId");
