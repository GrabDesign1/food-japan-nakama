-- CreateEnum
CREATE TYPE "OfferingDirection" AS ENUM ('GIVE', 'WANT');

-- CreateTable
CREATE TABLE "offerings" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "direction" "OfferingDirection" NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount_value" DOUBLE PRECISION,
    "amount_unit" TEXT,
    "amount_period" TEXT,
    "amount_text" TEXT,
    "timing" TEXT,
    "area" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offerings_member_id_idx" ON "offerings"("member_id");

-- CreateIndex
CREATE INDEX "offerings_direction_idx" ON "offerings"("direction");

-- CreateIndex
CREATE INDEX "offerings_category_idx" ON "offerings"("category");

-- AddForeignKey
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
