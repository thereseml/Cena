import { Injectable, NotFoundException } from '@nestjs/common';
import type { RecipeDetail, RecipePage, RecipeSummary } from '@cena/contracts';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { HouseholdsService } from '../households/households.service';
import { unitFromDatabase } from '../inventory/inventory-validation';
import { PrismaService } from '../prisma/prisma.module';
import {
  compareRecipeRank,
  matchRecipe,
  MatchingBatch,
  PreparedRecipeInventory,
  prepareRecipeInventory,
  stockholmDate,
} from './recipe-matching';
import { normalizeIngredientName } from './recipe-normalization';
import { parseRecipeQuery, parseRecipeUnit } from './recipe-validation';

const SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  mealCategory: true,
  preparationMinutes: true,
  cookingMinutes: true,
  totalMinutes: true,
  servings: true,
  tags: true,
} satisfies Prisma.RecipeSelect;
type SummaryRow = Prisma.RecipeGetPayload<{ select: typeof SUMMARY_SELECT }>;
const INGREDIENT_SELECT = {
  id: true,
  ingredientId: true,
  displayName: true,
  quantity: true,
  unit: true,
  preparationNotes: true,
  sortOrder: true,
} satisfies Prisma.RecipeIngredientSelect;
type IngredientRow = Prisma.RecipeIngredientGetPayload<{ select: typeof INGREDIENT_SELECT }>;

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly households: HouseholdsService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: unknown,
    recommendations = false,
  ): Promise<RecipePage> {
    const filters = parseRecipeQuery(query, recommendations);
    const batches = filters.householdId
      ? prepareRecipeInventory(await this.inventory(user, filters.householdId))
      : null;
    const today = stockholmDate();
    const where: Prisma.RecipeWhereInput = {
      status: 'PUBLISHED',
      ...(filters.search ? { title: { contains: filters.search, mode: 'insensitive' } } : {}),
      ...(filters.mealCategory ? { mealCategory: filters.mealCategory } : {}),
      ...(filters.maxTotalMinutes ? { totalMinutes: { lte: filters.maxTotalMinutes } } : {}),
    };
    const offset = (filters.page - 1) * filters.pageSize;
    const select = {
      ...SUMMARY_SELECT,
      ingredients: { select: INGREDIENT_SELECT, orderBy: { sortOrder: 'asc' as const } },
    };
    if (!recommendations) {
      const [rows, total] = await this.prisma.$transaction([
        this.prisma.recipe.findMany({
          where,
          select,
          orderBy: [{ title: 'asc' }, { id: 'asc' }],
          skip: offset,
          take: filters.pageSize,
        }),
        this.prisma.recipe.count({ where }),
      ]);
      return {
        items: rows.map((row) => this.summary(row, row.ingredients, batches, today)),
        page: filters.page,
        pageSize: filters.pageSize,
        total,
      };
    }

    // Scan compact candidates in bounded batches; retain only the requested top window.
    // No full recipes/instructions or household-derived caches are loaded globally.
    let cursor: string | undefined;
    let total = 0;
    const best: RecipeSummary[] = [];
    for (;;) {
      const candidates = await this.prisma.recipe.findMany({
        where,
        select,
        orderBy: { id: 'asc' },
        take: 100,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const candidate of candidates) {
        best.push(this.summary(candidate, candidate.ingredients, batches, today));
      }
      total += candidates.length;
      best.sort(compareRecipeRank);
      best.splice(offset + filters.pageSize);
      if (candidates.length < 100) break;
      cursor = candidates[candidates.length - 1].id;
    }
    return { items: best.slice(offset), page: filters.page, pageSize: filters.pageSize, total };
  }

  async get(user: AuthenticatedUser, id: string, query: unknown): Promise<RecipeDetail> {
    const filters = parseRecipeQuery(query);
    const batches = filters.householdId
      ? prepareRecipeInventory(await this.inventory(user, filters.householdId))
      : null;
    const row = await this.prisma.recipe.findFirst({
      where: { id, status: 'PUBLISHED' },
      select: {
        ...SUMMARY_SELECT,
        instructions: true,
        ingredients: { select: INGREDIENT_SELECT, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('Receptet kunde inte hittas.');
    const today = stockholmDate();
    const ingredients = this.ingredients(row.ingredients);
    return {
      ...this.summary(row, row.ingredients, batches, today),
      instructions: row.instructions,
      ingredients: batches
        ? matchRecipe(ingredients, batches, today).ingredients
        : ingredients.map((ingredient) => ({
            ...ingredient,
            quantity: ingredient.quantity === null ? null : Number(ingredient.quantity.toString()),
            availability: null,
            reason: null,
            availableQuantity: null,
            missingQuantity: null,
          })),
    };
  }

  private summary(
    row: SummaryRow,
    ingredients: IngredientRow[],
    batches: PreparedRecipeInventory | null,
    today: string,
  ): RecipeSummary {
    const { ...fields } = row;
    // Explicit projection: Prisma rows can also carry instructions and ingredient relations.
    return {
      id: fields.id,
      slug: fields.slug,
      title: fields.title,
      description: fields.description,
      mealCategory: fields.mealCategory,
      preparationMinutes: fields.preparationMinutes,
      cookingMinutes: fields.cookingMinutes,
      totalMinutes: fields.totalMinutes,
      servings: fields.servings,
      tags: fields.tags,
      availability: batches
        ? matchRecipe(this.ingredients(ingredients), batches, today).summary
        : null,
    };
  }

  private ingredients(rows: IngredientRow[]) {
    return rows.map((row) => ({ ...row, unit: parseRecipeUnit(row.unit) }));
  }

  private async inventory(user: AuthenticatedUser, householdId: string): Promise<MatchingBatch[]> {
    await this.households.getHouseholdForUser(user.id, householdId);
    const [items, aliases] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { householdId, archivedAt: null },
        include: { product: { include: { ingredient: true } }, batches: true },
      }),
      this.prisma.ingredientAlias.findMany(),
    ]);
    const aliasesByName = new Map(
      aliases.map((alias) => [alias.normalizedName, alias.ingredientId]),
    );
    return items.flatMap((item) => {
      const name = normalizeIngredientName(item.product.ingredient.normalizedName);
      const ingredientId = aliasesByName.get(name) ?? item.product.ingredientId;
      return item.batches.map((batch): MatchingBatch => ({
        id: batch.id,
        ingredientId,
        quantity: batch.quantity.toString(),
        unit: unitFromDatabase(item.unit),
        expiryDate: batch.expiryDate?.toISOString().slice(0, 10) ?? null,
        expiryType: batch.expiryType,
      }));
    });
  }
}
