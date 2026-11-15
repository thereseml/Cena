import { Prisma, type PrismaClient } from '@prisma/client';
import { RECIPE_LIBRARY, type SeedRecipe } from './index';
import { canonicalIngredient, INGREDIENT_CATALOG, type IngredientKey } from './ingredients';
import {
  recipeContentHash,
  SEED_SOURCE,
  validateApprovalManifest,
  validateLibrary,
} from './recipe-review';

const RECIPE_INCLUDE = {
  ingredients: { include: { ingredient: true }, orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.RecipeInclude;

type StoredRecipe = Prisma.RecipeGetPayload<{ include: typeof RECIPE_INCLUDE }>;

function storedContentHash(recipe: StoredRecipe): string {
  return recipeContentHash({
    ...recipe,
    ingredients: recipe.ingredients.map((row) => ({
      normalizedName: row.ingredient.normalizedName,
      canonicalName: row.ingredient.name,
      displayName: row.displayName,
      quantity: row.quantity === null ? null : Number(row.quantity),
      unit: row.unit as SeedRecipe['ingredients'][number]['unit'],
      preparationNotes: row.preparationNotes,
      sortOrder: row.sortOrder,
    })),
  });
}

export async function seedLibrary(
  prisma: PrismaClient,
  recipes: readonly SeedRecipe[] = RECIPE_LIBRARY,
) {
  validateLibrary(recipes);
  return prisma.$transaction(
    async (tx) => {
      const result = { created: 0, updated: 0, skipped: 0 };
      const pending: { recipe: SeedRecipe; contentHash: string; existing: StoredRecipe | null }[] =
        [];
      // Preflight the whole selection before changing ingredients or aliases.
      for (const recipe of recipes) {
        const existing = await tx.recipe.findUnique({
          where: { slug: recipe.slug },
          include: RECIPE_INCLUDE,
        });
        const contentHash = recipeContentHash(recipe);
        if (existing && existing.seedSource !== SEED_SOURCE) {
          throw new Error(`Refusing foreign-owned slug: ${recipe.slug}`);
        }
        const unchanged =
          existing &&
          existing.contentHash === contentHash &&
          storedContentHash(existing) === contentHash;
        if (existing?.status === 'PUBLISHED' && !unchanged) {
          throw new Error(`Published recipe changed: ${recipe.slug}`);
        }
        if (unchanged) result.skipped++;
        else pending.push({ recipe, contentHash, existing });
      }

      const ingredientIds = new Map<string, string>();
      for (const key of Object.keys(INGREDIENT_CATALOG) as IngredientKey[]) {
        const canonical = canonicalIngredient(key);
        const ingredient = await tx.ingredient.upsert({
          where: { normalizedName: canonical.normalizedName },
          create: { name: canonical.name, normalizedName: canonical.normalizedName },
          update: {},
        });
        ingredientIds.set(canonical.normalizedName, ingredient.id);
        for (const normalizedName of new Set([canonical.normalizedName, ...canonical.aliases])) {
          // Legacy ingredients/products stay intact; aliases resolve identity at read time.
          const alias = await tx.ingredientAlias.findUnique({ where: { normalizedName } });
          if (alias && alias.ingredientId !== ingredient.id) {
            throw new Error(`Alias already belongs to another ingredient: ${normalizedName}`);
          }
          if (!alias)
            await tx.ingredientAlias.create({
              data: { normalizedName, ingredientId: ingredient.id },
            });
        }
      }

      for (const { recipe, contentHash, existing } of pending) {
        const { ingredients, ...fields } = recipe;
        const data = {
          ...fields,
          contentHash,
          seedSource: SEED_SOURCE,
          status: 'DRAFT' as const,
          publishedAt: null,
          ingredients: {
            create: ingredients.map((ingredient) => {
              const ingredientId = ingredientIds.get(ingredient.normalizedName);
              if (!ingredientId)
                throw new Error(`Missing canonical ingredient: ${ingredient.normalizedName}`);
              return {
                ingredientId,
                displayName: ingredient.displayName,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                preparationNotes: ingredient.preparationNotes,
                sortOrder: ingredient.sortOrder,
              };
            }),
          },
        };
        if (existing) {
          await tx.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
          await tx.recipe.update({ where: { id: existing.id }, data });
          result.updated++;
        } else {
          await tx.recipe.create({ data });
          result.created++;
        }
      }
      return result;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000 },
  );
}

export async function publishLibrary(
  prisma: PrismaClient,
  approvalManifest: unknown,
  recipes: readonly SeedRecipe[] = RECIPE_LIBRARY,
) {
  validateLibrary(recipes);
  const approvals = validateApprovalManifest(approvalManifest);
  const source = new Map(recipes.map((recipe) => [recipe.slug, recipeContentHash(recipe)]));
  for (const approval of approvals) {
    if (source.get(approval.slug) !== approval.contentHash) {
      throw new Error(`Approval does not match current source: ${approval.slug}`);
    }
  }
  return prisma.$transaction(
    async (tx) => {
      const drafts: string[] = [];
      for (const approval of approvals) {
        const stored = await tx.recipe.findUnique({
          where: { slug: approval.slug },
          include: RECIPE_INCLUDE,
        });
        if (
          !stored ||
          stored.seedSource !== SEED_SOURCE ||
          stored.contentHash !== approval.contentHash ||
          storedContentHash(stored) !== approval.contentHash
        ) {
          throw new Error(`Approval does not match seeded database content: ${approval.slug}`);
        }
        if (stored.status === 'DRAFT') drafts.push(stored.id);
      }
      const publishedAt = new Date();
      for (const id of drafts) {
        await tx.recipe.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt } });
      }
      return { published: drafts.length, skipped: approvals.length - drafts.length };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000 },
  );
}
