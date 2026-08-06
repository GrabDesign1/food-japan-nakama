-- AlterTable
ALTER TABLE "offerings" ADD COLUMN     "image_urls" TEXT[],
ADD COLUMN     "points" TEXT,
ADD COLUMN     "tags" TEXT[];
