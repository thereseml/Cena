-- Unquantified seasoning is explicit, not an accidentally missing required quantity.
ALTER TABLE "recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_unquantified_check"
    CHECK ("quantity" IS NOT NULL OR "preparation_notes" IS NOT DISTINCT FROM 'efter smak');
