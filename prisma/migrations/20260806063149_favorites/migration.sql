-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorites_member_id_idx" ON "favorites"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_member_id_target_type_target_id_key" ON "favorites"("member_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
