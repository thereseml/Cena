import { EVERYDAY_CHICKEN_FISH } from './everyday-chicken-fish';
import { EVERYDAY_MEAT } from './everyday-meat';
import { QUICK_RECIPES } from './quick';
import { VEGETARIAN_RECIPES } from './vegetarian';
import { BREAKFAST_SNACK_RECIPES } from './breakfast-snacks';
import { SOUP_LUNCH_RECIPES } from './soups-lunches';

export const RECIPE_LIBRARY = [
  ...EVERYDAY_CHICKEN_FISH,
  ...EVERYDAY_MEAT,
  ...QUICK_RECIPES,
  ...VEGETARIAN_RECIPES,
  ...BREAKFAST_SNACK_RECIPES,
  ...SOUP_LUNCH_RECIPES,
];

export type { SeedIngredient, SeedRecipe } from './recipe-data';
export { INGREDIENT_CATALOG, canonicalIngredient } from './ingredients';
