-- AlterTable
ALTER TABLE "BrandProfile" ADD COLUMN "timeline" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "exclusiveServiceNote" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "privacyNote" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "serviceProcess" TEXT;

-- AlterTable
ALTER TABLE "BrandEnvironmentPhoto" ADD COLUMN "sceneTag" TEXT;

-- Featured shop selection for public homepage
ALTER TABLE "BrandProfile" ADD COLUMN "featuredShopKey" TEXT;
