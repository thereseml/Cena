import type {
  AvailabilityReason,
  IngredientAvailability,
  RecipeAvailabilitySummary,
  RecipeIngredient,
  RecipeUnit,
} from '@cena/contracts';
import { Prisma } from '@prisma/client';

export interface MatchingIngredient {
  id: string;
  ingredientId: string;
  displayName: string;
  quantity: { toString(): string } | null;
  unit: RecipeUnit;
  preparationNotes: string | null;
  sortOrder: number;
}

export interface MatchingBatch {
  id: string;
  ingredientId: string;
  quantity: string | null;
  unit: RecipeUnit;
  expiryDate: string | null;
  expiryType: 'BEST_BEFORE' | 'USE_BY' | null;
}

interface PreparedBatch extends MatchingBatch {
  remaining: Prisma.Decimal;
}

export interface PreparedRecipeInventory {
  byIngredient: ReadonlyMap<string, readonly PreparedBatch[]>;
}

export function prepareRecipeInventory(batches: readonly MatchingBatch[]): PreparedRecipeInventory {
  const byIngredient = new Map<string, PreparedBatch[]>();
  for (const batch of batches) {
    const group = byIngredient.get(batch.ingredientId) ?? [];
    group.push({
      ...batch,
      remaining: new Prisma.Decimal(batch.quantity ?? 0).mul(MEASURES[batch.unit].factor),
    });
    byIngredient.set(batch.ingredientId, group);
  }
  for (const group of byIngredient.values()) {
    group.sort(
      (a, b) =>
        (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999') || a.id.localeCompare(b.id),
    );
  }
  return { byIngredient };
}

const MEASURES: Record<RecipeUnit, { dimension: string; factor: number }> = {
  st: { dimension: 'count', factor: 1 },
  g: { dimension: 'mass', factor: 1 },
  kg: { dimension: 'mass', factor: 1000 },
  ml: { dimension: 'volume', factor: 1 },
  l: { dimension: 'volume', factor: 1000 },
  dl: { dimension: 'volume', factor: 100 },
  msk: { dimension: 'volume', factor: 15 },
  tsk: { dimension: 'volume', factor: 5 },
};

export function stockholmDate(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(now);
}

// A fresh pool per recipe: alternatives do not reserve stock, repeated rows share stock.
export function matchRecipe(
  ingredients: readonly MatchingIngredient[],
  batches: readonly MatchingBatch[] | PreparedRecipeInventory,
  today: string,
): { ingredients: RecipeIngredient[]; summary: RecipeAvailabilitySummary } {
  const inventory = 'byIngredient' in batches ? batches : prepareRecipeInventory(batches);
  const pools = new Map<string, PreparedBatch[]>();
  const rows = [...ingredients]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((ingredient): RecipeIngredient => {
      const measure = MEASURES[ingredient.unit];
      const quantity =
        ingredient.quantity === null ? null : new Prisma.Decimal(ingredient.quantity.toString());
      let reason: AvailabilityReason = 'NOT_FOUND';
      let availability: IngredientAvailability = 'MISSING';
      let allocated = new Prisma.Decimal(0);
      if (quantity === null) {
        reason = 'UNQUANTIFIED';
        availability = 'UNKNOWN';
      } else {
        const required = quantity.mul(measure.factor);
        let uncertain = false;
        let expired = false;
        let pool = pools.get(ingredient.ingredientId);
        if (!pool) {
          // Clone only relevant balances; the prepared request snapshot remains immutable.
          pool = (inventory.byIngredient.get(ingredient.ingredientId) ?? []).map((batch) => ({
            ...batch,
          }));
          pools.set(ingredient.ingredientId, pool);
        }
        for (const batch of pool) {
          if (batch.expiryDate && batch.expiryDate < today) {
            expired = true;
            // Past best-before needs human assessment; never count it automatically.
            if (batch.expiryType !== 'USE_BY') uncertain = true;
            continue;
          }
          if (batch.quantity === null || MEASURES[batch.unit].dimension !== measure.dimension) {
            uncertain = true;
            continue;
          }
          const take = Prisma.Decimal.min(batch.remaining, required.minus(allocated));
          batch.remaining = batch.remaining.minus(take);
          allocated = allocated.plus(take);
          if (allocated.gte(required)) break;
        }
        if (allocated.gte(required)) {
          availability = 'AVAILABLE';
          reason = 'SUFFICIENT';
        } else if (uncertain) {
          availability = 'UNKNOWN';
          reason = expired ? 'EXPIRED' : 'INCOMPATIBLE_UNIT';
        } else if (allocated.gt(0)) {
          availability = 'PARTIAL';
          reason = 'INSUFFICIENT';
        } else if (expired) {
          reason = 'EXPIRED';
        }
      }
      return {
        id: ingredient.id,
        displayName: ingredient.displayName,
        quantity: quantity?.toNumber() ?? null,
        unit: ingredient.unit,
        preparationNotes: ingredient.preparationNotes,
        sortOrder: ingredient.sortOrder,
        availability,
        reason,
        availableQuantity: quantity === null ? null : allocated.div(measure.factor).toNumber(),
        // For UNKNOWN this is the unverified remainder, not a confirmed shortage.
        missingQuantity:
          quantity === null || availability === 'UNKNOWN'
            ? null
            : quantity.minus(allocated.div(measure.factor)).toNumber(),
      };
    });
  const summary: RecipeAvailabilitySummary = {
    available: 0,
    partial: 0,
    missing: 0,
    unknown: 0,
    total: rows.length,
  };
  for (const row of rows) {
    if (row.availability === 'AVAILABLE') summary.available++;
    else if (row.availability === 'PARTIAL') summary.partial++;
    else if (row.availability === 'MISSING') summary.missing++;
    else summary.unknown++;
  }
  return { ingredients: rows, summary };
}

export interface RankedRecipe {
  id: string;
  totalMinutes: number;
  availability: RecipeAvailabilitySummary | null;
}

export function compareRecipeRank(a: RankedRecipe, b: RankedRecipe): number {
  const x = a.availability;
  const y = b.availability;
  if (!x || !y) return a.id.localeCompare(b.id);
  // Cross multiplication avoids rounding coverage. Partial/uncertain never count as full.
  return (
    y.available * x.total - x.available * y.total ||
    x.missing - y.missing ||
    x.unknown - y.unknown ||
    y.partial - x.partial ||
    a.totalMinutes - b.totalMinutes ||
    a.id.localeCompare(b.id)
  );
}
