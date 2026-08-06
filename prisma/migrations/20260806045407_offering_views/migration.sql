-- CreateTable
CREATE TABLE "offering_views" (
    "id" TEXT NOT NULL,
    "offering_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offering_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offering_views_offering_id_created_at_idx" ON "offering_views"("offering_id", "created_at");

-- AddForeignKey
ALTER TABLE "offering_views" ADD CONSTRAINT "offering_views_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
