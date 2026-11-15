import { BadRequestException } from '@nestjs/common';
import type { MealCategory, RecipeFilters, RecipeUnit } from '@cena/contracts';

const CATEGORIES: Record<MealCategory, true> = {
  DINNER: true,
  LUNCH: true,
  BREAKFAST: true,
  SNACK: true,
};
const UNITS: Record<RecipeUnit, true> = {
  st: true,
  g: true,
  kg: true,
  ml: true,
  l: true,
  dl: true,
  msk: true,
  tsk: true,
};

export function parseRecipeUnit(value: string): RecipeUnit {
  if (!Object.hasOwn(UNITS, value)) throw new Error('Invalid stored recipe unit');
  return value as RecipeUnit;
}

export function parseRecipeQuery(
  value: unknown,
  recommendations = false,
): Required<Pick<RecipeFilters, 'page' | 'pageSize'>> & RecipeFilters {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw invalid();
  const input = value as Record<string, unknown>;
  const allowed = ['householdId', 'search', 'mealCategory', 'maxTotalMinutes', 'page', 'pageSize'];
  if (Object.keys(input).some((key) => !allowed.includes(key))) throw invalid();
  const result: RecipeFilters & { page: number; pageSize: number } = {
    page: integer(input.page, 1, 1, 10000),
    pageSize: integer(input.pageSize, 20, 1, 50),
  };
  if (input.householdId !== undefined) {
    if (
      typeof input.householdId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.householdId,
      )
    )
      throw invalid();
    result.householdId = input.householdId;
  }
  if (recommendations && !result.householdId) throw invalid();
  if (input.search !== undefined) {
    if (typeof input.search !== 'string' || input.search.length > 100) throw invalid();
    result.search = input.search.trim();
  }
  if (input.mealCategory !== undefined) {
    if (typeof input.mealCategory !== 'string' || !Object.hasOwn(CATEGORIES, input.mealCategory))
      throw invalid();
    result.mealCategory = input.mealCategory as MealCategory;
  }
  if (input.maxTotalMinutes !== undefined)
    result.maxTotalMinutes = integer(input.maxTotalMinutes, 60, 1, 1440);
  return result;
}

function integer(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw invalid();
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw invalid();
  return number;
}

function invalid(): BadRequestException {
  return new BadRequestException(
    'Ogiltiga receptfilter. Kontrollera hushåll, kategori, tid och sida.',
  );
}
