-- AlterTable
ALTER TABLE "offering_views" ADD COLUMN     "viewer_user_id" TEXT;

-- CreateIndex
CREATE INDEX "offering_views_viewer_user_id_created_at_idx" ON "offering_views"("viewer_user_id", "created_at");
