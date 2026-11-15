import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HouseholdsService } from '../src/households/households.service';
import { PrismaService } from '../src/prisma/prisma.module';
import { RecipesService } from '../src/recipes/recipes.service';
import * as matching from '../src/recipes/recipe-matching';

const USER = { id: 'identity', email: 'recipe-test@example.com' };
const HOUSEHOLD = '00000000-0000-4000-8000-000000000001';
const ROW = {
  id: '00000000-0000-4000-8000-000000000010',
  slug: 'tomatsoppa',
  title: 'Tomatsoppa',
  description: 'En enkel soppa.',
  mealCategory: 'DINNER',
  preparationMinutes: 10,
  cookingMinutes: 20,
  totalMinutes: 30,
  servings: 2,
  tags: ['vardag'],
  instructions: ['Koka.'],
  ingredients: [
    {
      id: 'row',
      ingredientId: 'milk',
      displayName: 'Mjölk',
      quantity: new Prisma.Decimal('0.3'),
      unit: 'l',
      preparationNotes: null,
      sortOrder: 0,
    },
  ],
};

function setup() {
  const prisma = {
    recipe: {
      findMany: jest.fn().mockResolvedValue([ROW]),
      count: jest.fn().mockResolvedValue(3),
      findFirst: jest.fn().mockResolvedValue(ROW),
      update: jest.fn(),
      create: jest.fn(),
    },
    inventoryItem: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    ingredientAlias: { findMany: jest.fn().mockResolvedValue([]) },
    inventoryEvent: { create: jest.fn() },
    productBatch: { update: jest.fn() },
    $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
  };
  const households = { getHouseholdForUser: jest.fn().mockResolvedValue({ id: HOUSEHOLD }) };
  const service = new RecipesService(
    prisma as unknown as PrismaService,
    households as unknown as HouseholdsService,
  );
  return { prisma, households, service };
}

describe('RecipesService read boundaries', () => {
  it('always scopes browse and count to PUBLISHED, applies combined filters and pages in stable title/ID order', async () => {
    const { service, prisma } = setup();
    const result = await service.list(USER, {
      search: '  TOMAT ',
      mealCategory: 'DINNER',
      maxTotalMinutes: '30',
      page: '2',
      pageSize: '1',
    });
    const where = {
      status: 'PUBLISHED',
      title: { contains: 'TOMAT', mode: 'insensitive' },
      mealCategory: 'DINNER',
      totalMinutes: { lte: 30 },
    };
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        skip: 1,
        take: 1,
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(prisma.recipe.count).toHaveBeenCalledWith({ where });
    expect(result).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 3,
      items: [{ id: ROW.id, availability: null }],
    });
    expect(result.items[0]).not.toHaveProperty('instructions');
    expect(result.items[0]).not.toHaveProperty('ingredients');
    expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
  });

  it('enforces PUBLISHED on detail, converts Decimal and does not claim availability without a household', async () => {
    const { service, prisma } = setup();
    const result = await service.get(USER, ROW.id, {});
    expect(prisma.recipe.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ROW.id, status: 'PUBLISHED' } }),
    );
    expect(result).toMatchObject({
      availability: null,
      instructions: ['Koka.'],
      ingredients: [
        {
          quantity: 0.3,
          availability: null,
          reason: null,
          availableQuantity: null,
          missingQuantity: null,
        },
      ],
    });
    prisma.recipe.findFirst.mockResolvedValueOnce(null);
    await expect(service.get(USER, ROW.id, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('validates filters before authorization or data access and handles empty pages', async () => {
    const { service, prisma, households } = setup();
    await expect(service.list(USER, { householdId: HOUSEHOLD, page: ['1', '2'] })).rejects.toThrow(
      'Ogiltiga receptfilter',
    );
    await expect(service.get(USER, ROW.id, { status: 'DRAFT' })).rejects.toThrow(
      'Ogiltiga receptfilter',
    );
    expect(households.getHouseholdForUser).not.toHaveBeenCalled();
    expect(prisma.recipe.findMany).not.toHaveBeenCalled();
    expect(prisma.recipe.findFirst).not.toHaveBeenCalled();
    prisma.recipe.findMany.mockResolvedValue([]);
    prisma.recipe.count.mockResolvedValue(0);
    expect(await service.list(USER, { page: '3' })).toEqual({
      items: [],
      page: 3,
      pageSize: 20,
      total: 0,
    });
    expect(await service.list(USER, { householdId: HOUSEHOLD }, true)).toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
  });

  it.each(['list', 'detail', 'recommendations'])(
    'authorizes household before any recipe, alias or inventory query for %s',
    async (operation) => {
      const { service, prisma, households } = setup();
      households.getHouseholdForUser.mockRejectedValue(new NotFoundException());
      const query = { householdId: HOUSEHOLD };
      const call =
        operation === 'detail'
          ? service.get(USER, ROW.id, query)
          : service.list(USER, query, operation === 'recommendations');
      await expect(call).rejects.toBeInstanceOf(NotFoundException);
      expect(households.getHouseholdForUser).toHaveBeenCalledWith(USER.id, HOUSEHOLD);
      expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
      expect(prisma.ingredientAlias.findMany).not.toHaveBeenCalled();
      expect(prisma.recipe.findMany).not.toHaveBeenCalled();
      expect(prisma.recipe.findFirst).not.toHaveBeenCalled();
      expect(prisma.recipe.count).not.toHaveBeenCalled();
    },
  );

  it('queries only active household stock, resolves normalized exact aliases and never infers receipt package volumes', async () => {
    const { service, prisma, households } = setup();
    prisma.ingredientAlias.findMany.mockResolvedValue([
      { normalizedName: 'standard mjölk', ingredientId: 'milk' },
    ]);
    const item = {
      unit: 'MILLILITER',
      product: {
        ingredientId: 'manual-milk',
        ingredient: { normalizedName: '  STANDARD  MJO\u0308LK  ' },
      },
      batches: [
        { id: 'stock', quantity: new Prisma.Decimal('300'), expiryDate: null, expiryType: null },
      ],
    };
    prisma.inventoryItem.findMany.mockResolvedValue([item]);
    const detail = await service.get(USER, ROW.id, { householdId: HOUSEHOLD });
    expect(detail.ingredients[0]).toMatchObject({
      availability: 'AVAILABLE',
      availableQuantity: 0.3,
    });
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith({
      where: { householdId: HOUSEHOLD, archivedAt: null },
      include: { product: { include: { ingredient: true } }, batches: true },
    });
    expect(households.getHouseholdForUser.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.inventoryItem.findMany.mock.invocationCallOrder[0],
    );

    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        ...item,
        unit: 'PIECE',
        batches: [{ ...item.batches[0], quantity: new Prisma.Decimal(2) }],
      },
    ]);
    expect(
      (await service.get(USER, ROW.id, { householdId: HOUSEHOLD })).ingredients[0],
    ).toMatchObject({ availability: 'UNKNOWN', availableQuantity: 0, missingQuantity: null });
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        ...item,
        product: { ...item.product, ingredient: { normalizedName: 'standard mjölk extra' } },
      },
    ]);
    expect(
      (await service.get(USER, ROW.id, { householdId: HOUSEHOLD })).ingredients[0].availability,
    ).toBe('MISSING');
  });

  it('ranks before paging across candidate batches, retaining deterministic ties and PUBLISHED filters', async () => {
    const { service, prisma } = setup();
    const rows = Array.from({ length: 101 }, (_, index) => ({
      ...ROW,
      id: String(index).padStart(3, '0'),
      totalMinutes: index === 100 ? 5 : 30,
    }));
    prisma.recipe.findMany
      .mockResolvedValueOnce(rows.slice(0, 100))
      .mockResolvedValueOnce(rows.slice(100));
    const result = await service.list(
      USER,
      { householdId: HOUSEHOLD, page: '2', pageSize: '2', mealCategory: 'DINNER' },
      true,
    );
    // The best candidate is in the second DB batch and must displace the first page.
    expect(result).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 101,
      items: [{ id: '001' }, { id: '002' }],
    });
    expect(prisma.recipe.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { status: 'PUBLISHED', mealCategory: 'DINNER' },
        take: 100,
        orderBy: { id: 'asc' },
      }),
    );
    expect(prisma.recipe.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: { id: '099' }, skip: 1, take: 100 }),
    );
    expect(prisma.recipe.count).not.toHaveBeenCalled();
  });

  it('prepares inventory once for 1000 candidates across cursor batches without sharing allocations', async () => {
    const { service, prisma, households } = setup();
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      ...ROW,
      id: String(index).padStart(4, '0'),
      totalMinutes: index === 999 ? 5 : 30,
    }));
    prisma.recipe.findMany.mockReset();
    for (let offset = 0; offset < rows.length; offset += 100) {
      prisma.recipe.findMany.mockResolvedValueOnce(rows.slice(offset, offset + 100));
    }
    prisma.recipe.findMany.mockResolvedValueOnce([]);
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        unit: 'MILLILITER',
        product: { ingredientId: 'milk', ingredient: { normalizedName: 'milk' } },
        batches: [
          { id: 'stock', quantity: new Prisma.Decimal(300), expiryDate: null, expiryType: null },
        ],
      },
    ]);
    const prepare = jest.spyOn(matching, 'prepareRecipeInventory');
    const match = jest.spyOn(matching, 'matchRecipe');
    try {
      const result = await service.list(USER, { householdId: HOUSEHOLD, pageSize: '3' }, true);
      expect(result.total).toBe(1000);
      expect(result.items.map((row) => row.id)).toEqual(['0999', '0000', '0001']);
      expect(result.items.every((row) => row.availability?.available === 1)).toBe(true);
      expect(prisma.recipe.findMany).toHaveBeenCalledTimes(11);
      expect(prisma.recipe.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { status: 'PUBLISHED' },
          take: 100,
          orderBy: { id: 'asc' },
        }),
      );
      expect(prisma.recipe.findMany.mock.calls[0][0]).not.toHaveProperty('cursor');
      for (let call = 2; call <= 11; call++) {
        expect(prisma.recipe.findMany).toHaveBeenNthCalledWith(
          call,
          expect.objectContaining({
            where: { status: 'PUBLISHED' },
            take: 100,
            skip: 1,
            cursor: { id: String((call - 1) * 100 - 1).padStart(4, '0') },
          }),
        );
      }
      expect(households.getHouseholdForUser).toHaveBeenCalledTimes(1);
      expect(prisma.inventoryItem.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.ingredientAlias.findMany).toHaveBeenCalledTimes(1);
      expect(prepare).toHaveBeenCalledTimes(1);
      expect(match).toHaveBeenCalledTimes(1000);
      const prepared = prepare.mock.results[0].value;
      expect(match.mock.calls.every((call) => call[1] === prepared)).toBe(true);
      expect(match.mock.results.every((result) => result.value.summary.available === 1)).toBe(true);
      expect(prepared.byIngredient.get('milk')[0].remaining.toString()).toBe('300');
      expect(prisma.recipe.count).not.toHaveBeenCalled();
    } finally {
      match.mockRestore();
      prepare.mockRestore();
    }
  });

  it('does not mutate inventory, events or recipes on browse, recommendation or detail', async () => {
    const { service, prisma } = setup();
    await service.list(USER, { householdId: HOUSEHOLD });
    await service.list(USER, { householdId: HOUSEHOLD }, true);
    await service.get(USER, ROW.id, { householdId: HOUSEHOLD });
    expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    expect(prisma.productBatch.update).not.toHaveBeenCalled();
    expect(prisma.inventoryEvent.create).not.toHaveBeenCalled();
    expect(prisma.recipe.update).not.toHaveBeenCalled();
    expect(prisma.recipe.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(Array.isArray(prisma.$transaction.mock.calls[0][0])).toBe(true);
  });
});
