-- AlterTable
ALTER TABLE "offerings" ADD COLUMN     "verified_lead_at" TIMESTAMP(3),
ADD COLUMN     "verified_lead_by" TEXT,
ADD COLUMN     "verified_lead_note" TEXT;

-- CreateTable
CREATE TABLE "billing_products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "billing_type" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "effect_type" TEXT NOT NULL,
    "price_amount" INTEGER NOT NULL,
    "duration_days" INTEGER,
    "unit_limit" INTEGER,
    "requires_review" BOOLEAN NOT NULL DEFAULT false,
    "member_discount_percent" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "offering_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "subtotal_amount" INTEGER NOT NULL,
    "discount_amount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'jpy',
    "stripe_checkout_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "idempotency_key" TEXT,
    "paid_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "effect_type" TEXT NOT NULL,
    "duration_days_snapshot" INTEGER,

    CONSTRAINT "billing_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_promotions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "offering_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "effect_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "ending_notice_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_unlocks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "seller_member_id" TEXT NOT NULL,
    "offering_id" TEXT NOT NULL,
    "seeker_member_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "message_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unlocked',
    "pricing_tier" TEXT NOT NULL,
    "credit_ledger_entry_id" TEXT,
    "opened_at" TIMESTAMP(3),
    "unread_refund_due_at" TIMESTAMP(3),
    "unread_refunded_at" TIMESTAMP(3),
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_credit_ledger" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "entry_type" TEXT NOT NULL,
    "credit_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lot_entry_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "order_item_id" TEXT,
    "contact_unlock_id" TEXT,
    "idempotency_key" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_products_code_key" ON "billing_products"("code");

-- CreateIndex
CREATE INDEX "billing_products_tenant_id_active_idx" ON "billing_products"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "billing_orders_stripe_checkout_session_id_key" ON "billing_orders"("stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_orders_stripe_payment_intent_id_key" ON "billing_orders"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_orders_idempotency_key_key" ON "billing_orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "billing_orders_member_id_created_at_idx" ON "billing_orders"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "billing_orders_status_idx" ON "billing_orders"("status");

-- CreateIndex
CREATE INDEX "billing_order_items_order_id_idx" ON "billing_order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_promotions_order_item_id_key" ON "listing_promotions"("order_item_id");

-- CreateIndex
CREATE INDEX "listing_promotions_offering_id_idx" ON "listing_promotions"("offering_id");

-- CreateIndex
CREATE INDEX "listing_promotions_status_ends_at_idx" ON "listing_promotions"("status", "ends_at");

-- CreateIndex
CREATE INDEX "contact_unlocks_seeker_member_id_idx" ON "contact_unlocks"("seeker_member_id");

-- CreateIndex
CREATE INDEX "contact_unlocks_unread_refund_due_at_idx" ON "contact_unlocks"("unread_refund_due_at");

-- CreateIndex
CREATE UNIQUE INDEX "contact_unlocks_seller_member_id_offering_id_key" ON "contact_unlocks"("seller_member_id", "offering_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_credit_ledger_idempotency_key_key" ON "contact_credit_ledger"("idempotency_key");

-- CreateIndex
CREATE INDEX "contact_credit_ledger_member_id_credit_type_idx" ON "contact_credit_ledger"("member_id", "credit_type");

-- CreateIndex
CREATE INDEX "contact_credit_ledger_lot_entry_id_idx" ON "contact_credit_ledger"("lot_entry_id");

-- AddForeignKey
ALTER TABLE "billing_order_items" ADD CONSTRAINT "billing_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "billing_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_order_items" ADD CONSTRAINT "billing_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "billing_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
