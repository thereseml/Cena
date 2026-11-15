CREATE TABLE "shopping_lists" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shopping_list_items" (
    "id" UUID NOT NULL,
    "shopping_list_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "quantity" DECIMAL(12,3),
    "unit" "InventoryUnit",
    "is_purchased" BOOLEAN NOT NULL DEFAULT false,
    "recipe_id" UUID,
    "recipe_title" TEXT,
    "recipe_ingredient_id" UUID,
    "imported_inventory_item_id" UUID,
    "transferred_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shopping_list_items_quantity_positive" CHECK ("quantity" IS NULL OR "quantity" > 0),
    CONSTRAINT "shopping_list_items_unit_requires_quantity" CHECK ("quantity" IS NOT NULL OR "unit" IS NULL)
);

CREATE UNIQUE INDEX "shopping_lists_household_id_key" ON "shopping_lists"("household_id");
CREATE UNIQUE INDEX "shopping_list_items_imported_inventory_item_id_key" ON "shopping_list_items"("imported_inventory_item_id");
CREATE UNIQUE INDEX "shopping_list_items_one_unpurchased_name_idx"
  ON "shopping_list_items"("shopping_list_id", "normalized_name")
  WHERE "is_purchased" = false AND "transferred_at" IS NULL;
CREATE INDEX "shopping_list_items_shopping_list_id_transferred_at_is_purchased_created_at_idx"
  ON "shopping_list_items"("shopping_list_id", "transferred_at", "is_purchased", "created_at");
CREATE INDEX "shopping_list_items_recipe_id_idx" ON "shopping_list_items"("recipe_id");

ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_household_id_fkey"
  FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_shopping_list_id_fkey"
  FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_recipe_id_fkey"
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_imported_inventory_item_id_fkey"
  FOREIGN KEY ("imported_inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shopping_lists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shopping_list_items" ENABLE ROW LEVEL SECURITY;
