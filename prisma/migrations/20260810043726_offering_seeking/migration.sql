-- AlterTable
ALTER TABLE "offerings" ADD COLUMN     "seeking_type" TEXT,
ADD COLUMN     "usage_context" TEXT;

-- CreateTable
CREATE TABLE "offering_requirements" (
    "id" TEXT NOT NULL,
    "offering_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "offering_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offering_requirements_offering_id_idx" ON "offering_requirements"("offering_id");

-- AddForeignKey
ALTER TABLE "offering_requirements" ADD CONSTRAINT "offering_requirements_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
