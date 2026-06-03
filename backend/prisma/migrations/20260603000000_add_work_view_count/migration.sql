-- Add viewCount column to NailWork
ALTER TABLE "NailWork" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- Add isRead column to NailWorkLike
ALTER TABLE "NailWorkLike" ADD COLUMN "isRead" BOOLEAN NOT NULL DEFAULT false;

-- Add isRead column to NailWorkFavorite
ALTER TABLE "NailWorkFavorite" ADD COLUMN "isRead" BOOLEAN NOT NULL DEFAULT false;
