-- AlterTable
ALTER TABLE "offerings" ADD COLUMN     "application_deadline" TIMESTAMP(3),
ADD COLUMN     "delivery_methods" TEXT[],
ADD COLUMN     "desired_partner" TEXT,
ADD COLUMN     "item_condition" TEXT,
ADD COLUMN     "min_order_text" TEXT,
ADD COLUMN     "price_amount" DOUBLE PRECISION,
ADD COLUMN     "price_type" TEXT,
ADD COLUMN     "price_unit" TEXT,
ADD COLUMN     "shelf_life_text" TEXT,
ADD COLUMN     "shipping_cost_bearer" TEXT,
ADD COLUMN     "specification" TEXT,
ADD COLUMN     "storage_type" TEXT,
ADD COLUMN     "supply_frequency" TEXT;
