import {
  MEAL_CATEGORIES,
  RECIPE_UNITS,
  type IngredientAvailability,
  type AvailabilityReason,
  type RecipeAvailabilitySummary,
  type RecipeDetail,
  type RecipeIngredient,
  type RecipePage,
  type RecipeSummary,
} from '@cena/contracts';

const AVAILABILITIES: readonly IngredientAvailability[] = [
  'AVAILABLE',
  'PARTIAL',
  'MISSING',
  'UNKNOWN',
];
const REASONS: readonly AvailabilityReason[] = [
  'SUFFICIENT',
  'INSUFFICIENT',
  'NOT_FOUND',
  'INCOMPATIBLE_UNIT',
  'EXPIRED',
  'UNQUANTIFIED',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isCount(value: unknown): value is number {
  return isNumber(value) && Number.isSafeInteger(value);
}

function isEnum<T extends string>(value: unknown, values: readonly T[]): value is T {
  return values.some((option) => option === value);
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}

function isAvailability(value: unknown): value is RecipeAvailabilitySummary {
  return (
    isRecord(value) &&
    isCount(value.available) &&
    isCount(value.partial) &&
    isCount(value.missing) &&
    isCount(value.unknown) &&
    isCount(value.total)
  );
}

function isSummary(value: unknown): value is RecipeSummary {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    isEnum(value.mealCategory, MEAL_CATEGORIES) &&
    isNumber(value.preparationMinutes) &&
    isNumber(value.cookingMinutes) &&
    isNumber(value.totalMinutes) &&
    isNumber(value.servings) &&
    value.servings > 0 &&
    isStrings(value.tags) &&
    typeof value.usesExpiringIngredients === 'boolean' &&
    (value.availability === null || isAvailability(value.availability))
  );
}

function isIngredient(value: unknown): value is RecipeIngredient {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.displayName === 'string' &&
    (value.quantity === null || isNumber(value.quantity)) &&
    isEnum(value.unit, RECIPE_UNITS) &&
    (value.preparationNotes === null || typeof value.preparationNotes === 'string') &&
    isCount(value.sortOrder) &&
    (value.availability === null || isEnum(value.availability, AVAILABILITIES)) &&
    (value.reason === null || isEnum(value.reason, REASONS)) &&
    (value.availableQuantity === null || isNumber(value.availableQuantity)) &&
    (value.missingQuantity === null || isNumber(value.missingQuantity))
  );
}

export function parseRecipePage(value: unknown): RecipePage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    !value.items.every(isSummary) ||
    !isCount(value.page) ||
    value.page < 1 ||
    !isCount(value.pageSize) ||
    value.pageSize < 1 ||
    !isCount(value.total)
  ) {
    throw new Error('Invalid recipe page response');
  }
  return { items: value.items, page: value.page, pageSize: value.pageSize, total: value.total };
}

export function parseRecipeDetail(value: unknown): RecipeDetail {
  if (
    !isRecord(value) ||
    !isSummary(value) ||
    !Array.isArray(value.ingredients) ||
    !value.ingredients.every(isIngredient) ||
    !isStrings(value.instructions)
  ) {
    throw new Error('Invalid recipe detail response');
  }
  return { ...value, ingredients: value.ingredients, instructions: value.instructions };
}
