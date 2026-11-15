CREATE TYPE "MealCategory" AS ENUM ('DINNER', 'LUNCH', 'BREAKFAST', 'SNACK');
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "meal_category" "MealCategory" NOT NULL,
    "preparation_minutes" INTEGER NOT NULL,
    "cooking_minutes" INTEGER NOT NULL,
    "total_minutes" INTEGER NOT NULL,
    "servings" INTEGER NOT NULL,
    "instructions" TEXT[] NOT NULL,
    "tags" TEXT[] NOT NULL,
    "status" "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
    "seed_source" TEXT,
    "content_hash" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recipes_times_check" CHECK (
        "preparation_minutes" >= 0 AND "cooking_minutes" >= 0 AND
        "total_minutes" > 0 AND "total_minutes" = "preparation_minutes" + "cooking_minutes"
    ),
    CONSTRAINT "recipes_servings_check" CHECK ("servings" > 0),
    CONSTRAINT "recipes_content_check" CHECK (
        length(trim("title")) > 0 AND length(trim("description")) > 0 AND
        cardinality("instructions") > 0 AND length("content_hash") = 64
    ),
    CONSTRAINT "recipes_publication_check" CHECK (
        ("status" = 'DRAFT' AND "published_at" IS NULL) OR
        ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL)
    )
);

CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "quantity" DECIMAL(12,3),
    "unit" TEXT NOT NULL,
    "preparation_notes" TEXT,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recipe_ingredients_quantity_check" CHECK ("quantity" IS NULL OR "quantity" > 0),
    CONSTRAINT "recipe_ingredients_sort_check" CHECK ("sort_order" >= 0),
    CONSTRAINT "recipe_ingredients_unit_check" CHECK ("unit" IN ('st', 'g', 'kg', 'ml', 'l', 'dl', 'msk', 'tsk')),
    CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ingredient_aliases" (
    "id" UUID NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "ingredient_id" UUID NOT NULL,
    CONSTRAINT "ingredient_aliases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ingredient_aliases_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");
CREATE INDEX "recipes_status_meal_category_total_minutes_idx" ON "recipes"("status", "meal_category", "total_minutes");
CREATE INDEX "recipes_status_title_id_idx" ON "recipes"("status", "title", "id");
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_sort_order_key" ON "recipe_ingredients"("recipe_id", "sort_order");
CREATE INDEX "recipe_ingredients_ingredient_id_idx" ON "recipe_ingredients"("ingredient_id");
CREATE UNIQUE INDEX "ingredient_aliases_normalized_name_key" ON "ingredient_aliases"("normalized_name");
CREATE INDEX "ingredient_aliases_ingredient_id_idx" ON "ingredient_aliases"("ingredient_id");

-- Backend-only access, like inventory. No Data API policies grant draft visibility.
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipe_ingredients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ingredient_aliases" ENABLE ROW LEVEL SECURITY;
