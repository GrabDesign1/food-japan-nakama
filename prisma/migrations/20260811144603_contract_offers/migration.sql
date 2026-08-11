-- CreateTable
CREATE TABLE "contract_offers" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "offering_id" TEXT,
    "proposer_member_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "quantity_text" TEXT,
    "delivery_date" TIMESTAMP(3),
    "terms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "responded_at" TIMESTAMP(3),
    "responded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_offers_thread_id_idx" ON "contract_offers"("thread_id");

-- AddForeignKey
ALTER TABLE "contract_offers" ADD CONSTRAINT "contract_offers_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
