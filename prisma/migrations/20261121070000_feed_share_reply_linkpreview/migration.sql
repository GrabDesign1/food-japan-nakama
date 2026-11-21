-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "link_image_url" TEXT,
ADD COLUMN     "link_site_name" TEXT,
ADD COLUMN     "shared_post_id" TEXT;

-- AlterTable
ALTER TABLE "post_comments" ADD COLUMN     "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "posts_shared_post_id_idx" ON "posts"("shared_post_id");

-- CreateIndex
CREATE INDEX "post_comments_parent_id_idx" ON "post_comments"("parent_id");

