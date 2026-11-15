import { createHash } from 'node:crypto';
import type { MealCategory, RecipeUnit } from '@cena/contracts';
import { normalizeIngredientName } from '../recipe-normalization';
import { canonicalIngredient, INGREDIENT_CATALOG, type IngredientKey } from './ingredients';
import { RECIPE_LIBRARY, type SeedRecipe } from './index';

export const SEED_SOURCE = 'cena-initial-v1';

// Contracts are source-only ESM; keep the compiled CommonJS CLI executable in Node.
// Exhaustive records make contract changes a type error rather than silent drift.
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

export interface RecipeApproval {
  slug: string;
  contentHash: string;
}

// Hash normalized identity and recipe-owned display text, never mutable Ingredient.name.
// Explicit field order makes hashes independent of object insertion order and DB IDs.
export function recipeContentHash(recipe: SeedRecipe): string {
  const content = {
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    mealCategory: recipe.mealCategory,
    preparationMinutes: recipe.preparationMinutes,
    cookingMinutes: recipe.cookingMinutes,
    totalMinutes: recipe.totalMinutes,
    servings: recipe.servings,
    instructions: recipe.instructions,
    tags: recipe.tags,
    ingredients: recipe.ingredients.map((ingredient) => ({
      normalizedName: ingredient.normalizedName,
      displayName: ingredient.displayName,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      preparationNotes: ingredient.preparationNotes,
      sortOrder: ingredient.sortOrder,
    })),
  };
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

export function validateLibrary(recipes: readonly SeedRecipe[] = RECIPE_LIBRARY): void {
  const aliases = new Map<string, string>();
  const canonical = new Map<string, string>();
  for (const key of Object.keys(INGREDIENT_CATALOG) as IngredientKey[]) {
    const ingredient = canonicalIngredient(key);
    canonical.set(ingredient.normalizedName, ingredient.name);
    for (const name of [ingredient.normalizedName, ...ingredient.aliases]) {
      if (!name || (aliases.has(name) && aliases.get(name) !== ingredient.normalizedName)) {
        throw new Error(`Conflicting ingredient alias: ${name}`);
      }
      aliases.set(name, ingredient.normalizedName);
    }
  }
  const slugs = new Set<string>();
  const text = (value: string) => typeof value === 'string' && value.trim().length > 0;
  const integer = (value: number) => Number.isSafeInteger(value) && value >= 0;
  for (const recipe of recipes) {
    const fail = (message: string): never => {
      throw new Error(`${recipe.slug}: ${message}`);
    };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.slug) || slugs.has(recipe.slug)) {
      fail('Invalid or duplicate slug');
    }
    slugs.add(recipe.slug);
    if (
      !text(recipe.title) ||
      !text(recipe.description) ||
      !Object.hasOwn(CATEGORIES, recipe.mealCategory)
    ) {
      fail('Missing recipe metadata');
    }
    if (
      !integer(recipe.preparationMinutes) ||
      !integer(recipe.cookingMinutes) ||
      !integer(recipe.totalMinutes) ||
      recipe.totalMinutes < 1 ||
      recipe.totalMinutes !== recipe.preparationMinutes + recipe.cookingMinutes ||
      !integer(recipe.servings) ||
      recipe.servings < 1
    ) {
      fail('Invalid times or servings');
    }
    if (
      recipe.instructions.length < 3 ||
      !recipe.instructions.every(text) ||
      recipe.tags.length === 0 ||
      !recipe.tags.every(text) ||
      new Set(recipe.tags).size !== recipe.tags.length
    ) {
      fail('Missing instructions or invalid tags');
    }
    if (recipe.ingredients.length === 0) fail('Missing ingredients');
    for (const [index, ingredient] of recipe.ingredients.entries()) {
      if (
        ingredient.normalizedName !== normalizeIngredientName(ingredient.normalizedName) ||
        canonical.get(ingredient.normalizedName) !== ingredient.canonicalName ||
        !text(ingredient.displayName) ||
        ingredient.sortOrder !== index ||
        !Object.hasOwn(UNITS, ingredient.unit) ||
        (ingredient.preparationNotes !== null && !text(ingredient.preparationNotes))
      ) {
        fail(`Invalid ingredient at position ${index}`);
      }
      if (ingredient.quantity === null) {
        // Matching must classify these as UNKNOWN / UNQUANTIFIED, never AVAILABLE.
        if (ingredient.preparationNotes !== 'efter smak')
          fail('Unquantified ingredient requires efter smak');
      } else if (
        !Number.isFinite(ingredient.quantity) ||
        ingredient.quantity <= 0 ||
        ingredient.quantity >= 1_000_000_000 ||
        Math.abs(ingredient.quantity * 1000 - Math.round(ingredient.quantity * 1000)) > 0.000001
      ) {
        fail('Quantity must be positive and fit Decimal(12,3)');
      }
    }
  }
}

export function validateApprovalManifest(value: unknown): RecipeApproval[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error('Approval manifest must be a nonempty array');
  const slugs = new Set<string>();
  return value.map((entry: unknown) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('slug' in entry) ||
      !('contentHash' in entry) ||
      typeof entry.slug !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug) ||
      typeof entry.contentHash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.contentHash) ||
      Object.keys(entry).some((key) => key !== 'slug' && key !== 'contentHash') ||
      slugs.has(entry.slug)
    ) {
      throw new Error('Invalid or duplicate approval entry');
    }
    slugs.add(entry.slug);
    return { slug: entry.slug, contentHash: entry.contentHash };
  });
}

export function reviewLibrary(recipes: readonly SeedRecipe[] = RECIPE_LIBRARY): string {
  validateLibrary(recipes);
  const lines = [
    '# Cena Recipe Library Review',
    '',
    `Source: \`${SEED_SOURCE}\`. ${recipes.length} original Swedish recipe drafts.`,
    '',
    'Not physically test-cooked. Human editorial and food-safety review required before approval.',
    '',
    'Check portions, quantities, timings, temperatures, ingredient forms, allergens and all instructions.',
    'No allergy-safety guarantee. Availability for null quantities must remain UNKNOWN / UNQUANTIFIED.',
    '',
  ];
  for (const recipe of recipes) {
    lines.push(
      `## ${recipe.title}`,
      '',
      `Slug: \`${recipe.slug}\``,
      `SHA-256: \`${recipeContentHash(recipe)}\``,
      '',
      recipe.description,
      '',
      `${recipe.mealCategory}; ${recipe.servings} portioner; förberedelse ${recipe.preparationMinutes} min + tillagning ${recipe.cookingMinutes} min = ${recipe.totalMinutes} min.`,
      `Taggar: ${recipe.tags.join(', ')}`,
      '',
      '### Ingredienser',
      '',
    );
    for (const ingredient of recipe.ingredients) {
      lines.push(
        `- ${ingredient.quantity ?? 'efter smak'} ${ingredient.unit} ${ingredient.displayName}${ingredient.preparationNotes ? ` (${ingredient.preparationNotes})` : ''}; nyckel: \`${ingredient.normalizedName}\``,
      );
    }
    lines.push(
      '',
      '### Gör så här',
      '',
      ...recipe.instructions.map((step, index) => `${index + 1}. ${step}`),
      '',
    );
  }
  lines.push('## Exact Ingredient Aliases', '');
  for (const key of Object.keys(INGREDIENT_CATALOG) as IngredientKey[]) {
    const ingredient = canonicalIngredient(key);
    lines.push(
      `- ${ingredient.name}: ${[ingredient.normalizedName, ...ingredient.aliases].map((alias) => `\`${alias}\``).join(', ')}`,
    );
  }
  return lines.join('\n') + '\n';
}
