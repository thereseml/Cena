CREATE TYPE "InventoryUnit" AS ENUM ('PIECE', 'GRAM', 'KILOGRAM', 'MILLILITER', 'LITER');
CREATE TYPE "StorageLocation" AS ENUM ('FRIDGE', 'FREEZER', 'PANTRY');
CREATE TYPE "ExpiryType" AS ENUM ('BEST_BEFORE', 'USE_BY');
CREATE TYPE "ExpirySource" AS ENUM ('USER_ENTERED', 'ESTIMATED');
CREATE TYPE "InventoryEventType" AS ENUM ('ADDED', 'PURCHASED', 'ADJUSTED', 'REMOVED', 'DISCARDED', 'CONSUMED');

CREATE TABLE "ingredients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "default_unit" "InventoryUnit",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "create_request_id" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "storage_location" "StorageLocation" NOT NULL,
    "archived_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_batches" (
    "id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "expiry_date" DATE,
    "expiry_type" "ExpiryType",
    "expiry_source" "ExpirySource",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_batches_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "product_batches_expiry_metadata_complete" CHECK (
      ("expiry_date" IS NULL AND "expiry_type" IS NULL AND "expiry_source" IS NULL)
      OR ("expiry_date" IS NOT NULL AND "expiry_type" IS NOT NULL AND "expiry_source" IS NOT NULL)
    )
);

CREATE TABLE "inventory_events" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "product_batch_id" UUID,
    "event_type" "InventoryEventType" NOT NULL,
    "quantity_delta" DECIMAL(12,3) NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ingredients_normalized_name_key" ON "ingredients"("normalized_name");
CREATE UNIQUE INDEX "products_normalized_name_key" ON "products"("normalized_name");
CREATE INDEX "products_ingredient_id_idx" ON "products"("ingredient_id");
CREATE INDEX "inventory_items_household_id_archived_at_storage_location_idx"
  ON "inventory_items"("household_id", "archived_at", "storage_location");
CREATE UNIQUE INDEX "inventory_items_household_id_create_request_id_key"
  ON "inventory_items"("household_id", "create_request_id");
CREATE INDEX "inventory_items_product_id_idx" ON "inventory_items"("product_id");
CREATE INDEX "product_batches_inventory_item_id_idx" ON "product_batches"("inventory_item_id");
CREATE INDEX "product_batches_expiry_date_idx" ON "product_batches"("expiry_date");
CREATE INDEX "inventory_events_household_id_created_at_idx" ON "inventory_events"("household_id", "created_at");
CREATE INDEX "inventory_events_inventory_item_id_created_at_idx" ON "inventory_events"("inventory_item_id", "created_at");

ALTER TABLE "products"
  ADD CONSTRAINT "products_ingredient_id_fkey"
  FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_household_id_fkey"
  FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_batches"
  ADD CONSTRAINT "product_batches_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_events"
  ADD CONSTRAINT "inventory_events_household_id_fkey"
  FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_events"
  ADD CONSTRAINT "inventory_events_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_events"
  ADD CONSTRAINT "inventory_events_product_batch_id_fkey"
  FOREIGN KEY ("product_batch_id") REFERENCES "product_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ingredients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_events" ENABLE ROW LEVEL SECURITY;
