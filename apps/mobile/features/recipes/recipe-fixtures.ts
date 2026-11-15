import type { RecipeDetail, RecipePage } from '@cena/contracts';

// Static examples for stories and tests only; never used as an API fallback.
export const RECIPE_FIXTURE: RecipeDetail = {
  id: 'tomato-pasta',
  slug: 'tomatpasta',
  title: 'Krämig tomatpasta',
  description: 'En enkel vardagspasta med tomater och färsk basilika.',
  mealCategory: 'DINNER',
  preparationMinutes: 10,
  cookingMinutes: 15,
  totalMinutes: 25,
  servings: 2,
  tags: ['Vardag'],
  availability: { available: 1, partial: 1, missing: 1, unknown: 1, total: 4 },
  ingredients: [
    {
      id: 'pasta',
      displayName: 'Pasta',
      quantity: 200,
      unit: 'g',
      preparationNotes: null,
      sortOrder: 0,
      availability: 'AVAILABLE',
      reason: 'SUFFICIENT',
      availableQuantity: 500,
      missingQuantity: 0,
    },
    {
      id: 'tomato',
      displayName: 'Tomater',
      quantity: 300,
      unit: 'g',
      preparationNotes: 'Hackade',
      sortOrder: 1,
      availability: 'PARTIAL',
      reason: 'INSUFFICIENT',
      availableQuantity: 100,
      missingQuantity: 200,
    },
    {
      id: 'cream',
      displayName: 'Grädde',
      quantity: 1,
      unit: 'dl',
      preparationNotes: null,
      sortOrder: 2,
      availability: 'MISSING',
      reason: 'NOT_FOUND',
      availableQuantity: 0,
      missingQuantity: 1,
    },
    {
      id: 'basil',
      displayName: 'Basilika',
      quantity: null,
      unit: 'g',
      preparationNotes: 'Efter smak',
      sortOrder: 3,
      availability: 'UNKNOWN',
      reason: 'UNQUANTIFIED',
      availableQuantity: null,
      missingQuantity: null,
    },
  ],
  instructions: [
    'Koka pastan enligt förpackningen.',
    'Låt tomater och grädde sjuda. Blanda med pastan och basilikan.',
  ],
};

export const ALL_AVAILABLE_RECIPE: RecipeDetail = {
  ...RECIPE_FIXTURE,
  availability: { available: 4, partial: 0, missing: 0, unknown: 0, total: 4 },
  ingredients: RECIPE_FIXTURE.ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity ?? 5,
    availability: 'AVAILABLE',
    reason: 'SUFFICIENT',
    availableQuantity: ingredient.quantity ?? 5,
    missingQuantity: 0,
  })),
};

export const UNKNOWN_RECIPE: RecipeDetail = {
  ...RECIPE_FIXTURE,
  availability: null,
  ingredients: RECIPE_FIXTURE.ingredients.map((ingredient) => ({
    ...ingredient,
    availability: null,
    reason: null,
    availableQuantity: null,
    missingQuantity: null,
  })),
};

export const LONG_RECIPE: RecipeDetail = {
  ...RECIPE_FIXTURE,
  title:
    'Långrostade tomater med krämig pasta, färsk basilika och en riktigt lång recepttitel för hela sällskapet',
};

export const RECIPE_PAGE: RecipePage = { items: [RECIPE_FIXTURE], page: 1, pageSize: 12, total: 1 };
