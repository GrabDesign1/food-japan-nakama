-- CreateTable
CREATE TABLE "curated_articles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "image_url" TEXT,
    "excerpt" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curated_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curated_articles_tenant_id_idx" ON "curated_articles"("tenant_id");
