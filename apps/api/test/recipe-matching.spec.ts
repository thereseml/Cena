import { Prisma } from '@prisma/client';
import {
  compareRecipeRank,
  matchRecipe,
  prepareRecipeInventory,
  stockholmDate,
  type MatchingBatch,
  type MatchingIngredient,
  type RankedRecipe,
} from '../src/recipes/recipe-matching';
import { normalizeIngredientName } from '../src/recipes/recipe-normalization';

const TODAY = '2026-11-15';
const ingredient = (overrides: Partial<MatchingIngredient> = {}): MatchingIngredient => ({
  id: 'row-1',
  ingredientId: 'milk',
  displayName: 'Mjölk',
  quantity: new Prisma.Decimal('0.3'),
  unit: 'l',
  preparationNotes: null,
  sortOrder: 0,
  ...overrides,
});
const batch = (overrides: Partial<MatchingBatch> = {}): MatchingBatch => ({
  id: 'batch-1',
  ingredientId: 'milk',
  quantity: '300',
  unit: 'ml',
  expiryDate: null,
  expiryType: null,
  ...overrides,
});

describe('ingredient normalization and exact identity', () => {
  it('normalizes NFC, Swedish casing and whitespace without stripping meaningful accents', () => {
    expect(normalizeIngredientName('  MJO\u0308LK \t\n  Standard  ')).toBe('mjölk standard');
    expect(normalizeIngredientName('ÄGG')).toBe('ägg');
    expect(normalizeIngredientName('mjolk')).not.toBe(normalizeIngredientName('mjölk'));
  });

  it('matches canonical identities only, not similar names or substrings', () => {
    const result = matchRecipe([ingredient()], [batch({ ingredientId: 'oat-milk' })], TODAY);
    expect(result.ingredients[0]).toMatchObject({
      availability: 'MISSING',
      reason: 'NOT_FOUND',
      missingQuantity: 0.3,
    });
  });
});

describe('deterministic recipe quantities', () => {
  it.each([
    ['l', 'ml', '0.3', '300'],
    ['kg', 'g', '0.3', '300'],
    ['dl', 'l', '3', '0.3'],
    ['msk', 'ml', '2', '30'],
    ['tsk', 'ml', '2', '10'],
    ['st', 'st', '2', '2'],
  ] as const)('converts %s from %s exactly using Decimal', (unit, stockUnit, required, stock) => {
    const result = matchRecipe(
      [ingredient({ unit, quantity: new Prisma.Decimal(required) })],
      [batch({ unit: stockUnit, quantity: stock })],
      TODAY,
    );
    expect(result.ingredients[0]).toMatchObject({
      availability: 'AVAILABLE',
      reason: 'SUFFICIENT',
      availableQuantity: Number(required),
      missingQuantity: 0,
    });
  });

  it('adds decimal batches without floating point shortage', () => {
    const result = matchRecipe(
      [ingredient()],
      [batch({ unit: 'l', quantity: '0.1' }), batch({ id: 'batch-2', unit: 'l', quantity: '0.2' })],
      TODAY,
    );
    expect(result.ingredients[0]).toMatchObject({
      availability: 'AVAILABLE',
      availableQuantity: 0.3,
      missingQuantity: 0,
    });
  });

  it('reports partial and absent stock with quantities in recipe units', () => {
    const result = matchRecipe(
      [ingredient(), ingredient({ id: 'row-2', ingredientId: 'flour', sortOrder: 1 })],
      [batch({ quantity: '100' })],
      TODAY,
    );
    expect(result.ingredients).toMatchObject([
      {
        availability: 'PARTIAL',
        reason: 'INSUFFICIENT',
        availableQuantity: 0.1,
        missingQuantity: 0.2,
      },
      { availability: 'MISSING', reason: 'NOT_FOUND', availableQuantity: 0, missingQuantity: 0.3 },
    ]);
    expect(result.summary).toEqual({ available: 0, partial: 1, missing: 1, unknown: 0, total: 2 });
  });

  it('keeps name-only recipe quantities unknown even with abundant stock', () => {
    const result = matchRecipe(
      [ingredient({ quantity: null, preparationNotes: 'efter smak' })],
      [batch()],
      TODAY,
    );
    expect(result.ingredients[0]).toMatchObject({
      quantity: null,
      availability: 'UNKNOWN',
      reason: 'UNQUANTIFIED',
      availableQuantity: null,
      missingQuantity: null,
    });
    expect(result.summary.unknown).toBe(1);
  });

  it.each([batch({ quantity: null }), batch({ quantity: '2', unit: 'st' }), batch({ unit: 'g' })])(
    'does not infer liters from unknown quantities, receipt-style 2 st milk or mass',
    (stock) => {
      const result = matchRecipe([ingredient()], [stock], TODAY);
      expect(result.ingredients[0]).toMatchObject({
        availability: 'UNKNOWN',
        availableQuantity: 0,
        missingQuantity: null,
      });
    },
  );

  it('shares a stock pool across repeated rows but not across alternative recipes', () => {
    const rows = [ingredient({ id: 'second', sortOrder: 1 }), ingredient({ id: 'first' })];
    const stock = [batch({ quantity: '400' })];
    const snapshot = JSON.stringify({ rows, stock });
    const result = matchRecipe(rows, stock, TODAY);
    expect(result.ingredients).toMatchObject([
      { id: 'first', availability: 'AVAILABLE', availableQuantity: 0.3 },
      { id: 'second', availability: 'PARTIAL', availableQuantity: 0.1, missingQuantity: 0.2 },
    ]);
    expect(matchRecipe([ingredient()], stock, TODAY).ingredients[0].availability).toBe('AVAILABLE');
    expect(JSON.stringify({ rows, stock })).toBe(snapshot);
  });
});

describe('prepared request inventory', () => {
  it('groups exact identities, normalizes balances and sorts by expiry then batch ID without changing input', () => {
    const stock = [
      batch({ id: 'undated', quantity: '0.1', unit: 'l' }),
      batch({ id: 'b', quantity: '2', unit: 'dl', expiryDate: TODAY }),
      batch({ id: 'other', ingredientId: 'flour', quantity: '0.5', unit: 'kg' }),
      batch({ id: 'a', quantity: '3', unit: 'msk', expiryDate: TODAY }),
    ];
    const snapshot = JSON.stringify(stock);
    stock.forEach(Object.freeze);
    Object.freeze(stock);
    const prepared = prepareRecipeInventory(stock);
    expect([...prepared.byIngredient.keys()]).toEqual(['milk', 'flour']);
    expect(
      prepared.byIngredient.get('milk')?.map((row) => [row.id, row.remaining.toString()]),
    ).toEqual([
      ['a', '45'],
      ['b', '200'],
      ['undated', '100'],
    ]);
    expect(prepared.byIngredient.get('flour')?.[0].remaining.toString()).toBe('500');
    expect(JSON.stringify(stock)).toBe(snapshot);
  });

  it('reuses one immutable 1000-batch snapshot for 1000 independent recipes, sharing balance only within each recipe', () => {
    const stock = Array.from({ length: 1000 }, (_, index) =>
      batch({
        id: `batch-${String(index).padStart(4, '0')}`,
        ingredientId: `ingredient-${Math.floor(index / 4)}`,
        quantity: '100',
        expiryDate: [null, '2026-11-16', TODAY, '2026-11-14'][index % 4],
        expiryType: 'USE_BY',
      }),
    ).reverse();
    const recipes = Array.from({ length: 1000 }, (_, index) => [
      ingredient({
        id: `second-${index}`,
        ingredientId: `ingredient-${index % 250}`,
        quantity: new Prisma.Decimal('0.2'),
        sortOrder: 1,
      }),
      ingredient({
        id: `absent-${index}`,
        ingredientId: 'absent',
        quantity: new Prisma.Decimal('0.1'),
        sortOrder: 2,
      }),
      ingredient({
        id: `first-${index}`,
        ingredientId: `ingredient-${index % 250}`,
        quantity: new Prisma.Decimal('0.2'),
      }),
    ]);
    const originalStock = JSON.stringify(stock);
    const prepared = prepareRecipeInventory(stock);
    const snapshot = JSON.stringify([...prepared.byIngredient]);
    for (const group of prepared.byIngredient.values()) {
      group.forEach(Object.freeze);
      Object.freeze(group);
    }
    Object.freeze(prepared);
    const lookup = jest.spyOn(prepared.byIngredient, 'get');
    try {
      const results = recipes.map((rows) => matchRecipe(rows, prepared, TODAY));
      expect(results.map((result) => result.summary)).toEqual(
        Array.from({ length: 1000 }, () => ({
          available: 1,
          partial: 1,
          missing: 1,
          unknown: 0,
          total: 3,
        })),
      );
      expect(
        results.map((result) =>
          result.ingredients.map((row) => [
            row.availability,
            row.availableQuantity,
            row.missingQuantity,
          ]),
        ),
      ).toEqual(
        Array.from({ length: 1000 }, () => [
          ['AVAILABLE', 0.2, 0],
          ['PARTIAL', 0.1, 0.1],
          ['MISSING', 0, 0.1],
        ]),
      );
      // Repeated rows reuse their recipe-local pool; unrelated ingredient groups are never read.
      expect(lookup.mock.calls).toEqual(
        recipes.flatMap((_, index) => [[`ingredient-${index % 250}`], ['absent']]),
      );
      expect(
        [...recipes]
          .reverse()
          .map((rows) => matchRecipe(rows, prepared, TODAY))
          .reverse(),
      ).toEqual(results);
      expect(matchRecipe(recipes[0], stock, TODAY)).toEqual(results[0]);
      expect(JSON.stringify([...prepared.byIngredient])).toBe(snapshot);
      expect(JSON.stringify(stock)).toBe(originalStock);
    } finally {
      lookup.mockRestore();
    }
  });
});

describe('expiry and Stockholm calendar dates', () => {
  it.each([
    ['USE_BY', '2026-11-14', 'MISSING'],
    ['BEST_BEFORE', '2026-11-14', 'UNKNOWN'],
    ['USE_BY', TODAY, 'AVAILABLE'],
    ['BEST_BEFORE', TODAY, 'AVAILABLE'],
    ['USE_BY', '2026-11-16', 'AVAILABLE'],
  ] as const)('%s on %s is %s', (expiryType, expiryDate, availability) => {
    const row = matchRecipe([ingredient()], [batch({ expiryType, expiryDate })], TODAY)
      .ingredients[0];
    expect(row.availability).toBe(availability);
    expect(row.reason).toBe(availability === 'AVAILABLE' ? 'SUFFICIENT' : 'EXPIRED');
    expect(row.availableQuantity).toBe(availability === 'AVAILABLE' ? 0.3 : 0);
    expect(row.missingQuantity).toBe(
      availability === 'UNKNOWN' ? null : availability === 'MISSING' ? 0.3 : 0,
    );
  });

  it('ignores expired batches while allowing enough fresh stock', () => {
    const stocks = [
      batch({ expiryType: 'USE_BY', expiryDate: '2026-11-14' }),
      batch({ id: 'fresh' }),
    ];
    expect(matchRecipe([ingredient()], stocks, TODAY).ingredients[0].availability).toBe(
      'AVAILABLE',
    );
  });

  it.each([
    ['2026-11-14T22:59:59Z', '2026-11-14'],
    ['2026-11-14T23:00:00Z', TODAY],
    ['2026-06-14T21:59:59Z', '2026-06-14'],
    ['2026-06-14T22:00:00Z', '2026-06-15'],
    ['2026-03-29T01:00:00Z', '2026-03-29'],
  ])('uses Stockholm date for fixed instant %s', (instant, expected) => {
    expect(stockholmDate(new Date(instant))).toBe(expected);
  });
});

describe('recommendation ranking', () => {
  const ranked = (id: string, available = 1, total = 2, totalMinutes = 20): RankedRecipe => ({
    id,
    totalMinutes,
    availability: { available, total, partial: 0, missing: total - available, unknown: 0 },
  });

  it('ranks coverage before time, then fewer missing/unknown and more partial rows', () => {
    expect(compareRecipeRank(ranked('slow', 2, 2, 60), ranked('fast', 1, 2, 5))).toBeLessThan(0);
    expect(compareRecipeRank(ranked('small', 1, 2), ranked('large', 2, 4))).toBeLessThan(0);
    const unknown = ranked('unknown');
    unknown.availability = { available: 1, total: 2, partial: 0, missing: 0, unknown: 1 };
    const partial = ranked('partial');
    partial.availability = { available: 1, total: 2, partial: 1, missing: 0, unknown: 0 };
    expect(compareRecipeRank(partial, unknown)).toBeLessThan(0);
  });

  it('breaks equal scores by cooking time and finally ID independent of input order', () => {
    const rows = [ranked('b'), ranked('slow', 1, 2, 30), ranked('a')];
    expect([...rows].sort(compareRecipeRank).map((row) => row.id)).toEqual(['a', 'b', 'slow']);
    expect(
      [...rows]
        .reverse()
        .sort(compareRecipeRank)
        .map((row) => row.id),
    ).toEqual(['a', 'b', 'slow']);
    expect(compareRecipeRank(ranked('a'), ranked('a'))).toBe(0);
    expect(compareRecipeRank({ ...ranked('a'), availability: null }, ranked('b'))).toBeLessThan(0);
  });
});
