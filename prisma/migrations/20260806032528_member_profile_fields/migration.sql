-- AlterTable
ALTER TABLE "members" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contact_kana" TEXT,
ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "has_license" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image_urls" TEXT[],
ADD COLUMN     "license_name" TEXT,
ADD COLUMN     "postal_code" TEXT;
