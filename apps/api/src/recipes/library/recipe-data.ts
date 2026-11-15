import type { MealCategory, RecipeUnit } from '@cena/contracts';
import { canonicalIngredient, type IngredientKey } from './ingredients';

export interface SeedIngredient {
  normalizedName: string;
  canonicalName: string;
  displayName: string;
  quantity: number | null;
  unit: RecipeUnit;
  preparationNotes: string | null;
  sortOrder: number;
}

export interface SeedRecipe {
  slug: string;
  title: string;
  description: string;
  mealCategory: MealCategory;
  preparationMinutes: number;
  cookingMinutes: number;
  totalMinutes: number;
  servings: number;
  instructions: string[];
  tags: string[];
  ingredients: SeedIngredient[];
}

type IngredientInput = readonly [IngredientKey, number | null, RecipeUnit, string?];

const INGREDIENT_DISPLAY_NAMES: Partial<Record<IngredientKey, string>> = {
  garlic: 'Vitlöksklyftor',
  bread: 'Skivor fullkornsbröd',
};

export function recipe(
  slug: string,
  title: string,
  description: string,
  mealCategory: MealCategory,
  preparationMinutes: number,
  cookingMinutes: number,
  servings: number,
  tags: string[],
  ingredients: IngredientInput[],
  instructions: string[],
): SeedRecipe {
  return {
    slug,
    title,
    description,
    mealCategory,
    preparationMinutes,
    cookingMinutes,
    totalMinutes: preparationMinutes + cookingMinutes,
    servings,
    tags,
    instructions,
    ingredients: ingredients.map(([key, quantity, unit, notes], sortOrder) => {
      const canonical = canonicalIngredient(key);
      return {
        normalizedName: canonical.normalizedName,
        canonicalName: canonical.name,
        displayName: INGREDIENT_DISPLAY_NAMES[key] ?? canonical.name,
        quantity,
        unit,
        preparationNotes: notes ?? null,
        sortOrder,
      };
    }),
  };
}
