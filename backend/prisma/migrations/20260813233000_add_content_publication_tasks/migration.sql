CREATE TABLE "ContentPublicationTask" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "technicianId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'selecting_images',
  "imageUrls" TEXT,
  "headline" TEXT,
  "serviceSummary" TEXT,
  "designHighlights" TEXT,
  "bookingCallToAction" TEXT,
  "hashtags" TEXT,
  "platform" TEXT,
  "publishedAt" DATETIME,
  "originalUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentPublicationTask_technicianId_fkey" FOREIGN KEY("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContentPublicationTask_orderId_fkey" FOREIGN KEY("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ContentPublicationTask_orderId_key" ON "ContentPublicationTask"("orderId");
CREATE INDEX "ContentPublicationTask_technicianId_status_updatedAt_idx" ON "ContentPublicationTask"("technicianId","status","updatedAt");
