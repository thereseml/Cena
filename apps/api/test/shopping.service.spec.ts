import { ConflictException, NotFoundException } from '@nestjs/common';
import { ShoppingService } from '../src/shopping/shopping.service';

const user = { id: 'auth-user-id', email: 'user@example.com' };
const householdId = '00000000-0000-4000-8000-000000000001';
const listId = '00000000-0000-4000-8000-000000000002';
const shoppingItemId = '00000000-0000-4000-8000-000000000003';
const recipeId = '00000000-0000-4000-8000-000000000004';
const recipeIngredientId = '00000000-0000-4000-8000-000000000005';

function createDatabase() {
  const transaction = {
    shoppingListItem: {
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: shoppingItemId }),
    },
  };
  const prisma = {
    shoppingList: { upsert: jest.fn().mockResolvedValue({ id: listId }) },
    shoppingListItem: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findFirstOrThrow: jest.fn().mockResolvedValue({
        id: shoppingItemId,
        name: 'Mjölk',
        quantity: null,
        unit: null,
        isPurchased: false,
        recipeId: null,
        recipeTitle: null,
        version: 0,
        createdAt: new Date('2026-11-15T12:00:00.000Z'),
        updatedAt: new Date('2026-11-15T12:00:00.000Z'),
      }),
      create: jest.fn().mockResolvedValue({
        id: shoppingItemId,
        name: 'Mjölk',
        quantity: null,
        unit: null,
        isPurchased: false,
        recipeId: null,
        version: 0,
        createdAt: new Date('2026-11-15T12:00:00.000Z'),
        updatedAt: new Date('2026-11-15T12:00:00.000Z'),
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn(async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  };
  const households = { getHouseholdForUser: jest.fn().mockResolvedValue({ id: householdId }) };
  const inventory = {
    createPurchasedWithinTransaction: jest.fn().mockResolvedValue({ id: 'inventory-id' }),
  };
  const recipes = { get: jest.fn() };
  const service = new ShoppingService(
    prisma as never,
    households as never,
    inventory as never,
    recipes as never,
  );
  return { service, prisma, transaction, households, inventory, recipes };
}

describe('ShoppingService', () => {
  it('requires household membership before reading the list', async () => {
    const database = createDatabase();
    database.households.getHouseholdForUser.mockRejectedValue(new NotFoundException());

    await expect(database.service.list(user, householdId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(database.prisma.shoppingList.upsert).not.toHaveBeenCalled();
  });

  it('creates a household item without requiring quantity', async () => {
    const database = createDatabase();
    database.prisma.shoppingListItem.findFirst.mockResolvedValue({
      id: shoppingItemId,
      name: 'Mjölk',
      quantity: null,
      unit: null,
      isPurchased: false,
      recipeId: null,
      version: 0,
      createdAt: new Date('2026-11-15T12:00:00.000Z'),
      updatedAt: new Date('2026-11-15T12:00:00.000Z'),
    });

    await expect(
      database.service.add(user, householdId, { name: 'Mjölk', quantity: null, unit: null }),
    ).resolves.toMatchObject({ name: 'Mjölk', quantity: null, unit: null });
    expect(database.transaction.shoppingListItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shoppingListId: listId,
        normalizedName: 'mjölk',
        quantity: null,
        unit: null,
      }),
    });
  });

  it('rejects incomplete or invalid quantity and unit pairs', async () => {
    const database = createDatabase();
    await expect(
      database.service.add(user, householdId, { name: 'Pasta', quantity: 2, unit: null }),
    ).rejects.toThrow('Ange både mängd och enhet');
    await expect(
      database.service.add(user, householdId, { name: 'Pasta', quantity: -2, unit: 'g' }),
    ).rejects.toThrow('Mängden måste vara större än noll');
  });

  it('rejects a duplicate active name instead of silently adding a duplicate', async () => {
    const database = createDatabase();
    database.transaction.shoppingListItem.findFirst.mockResolvedValue({
      id: shoppingItemId,
      quantity: { add: jest.fn() },
      unit: 'LITER',
      version: 0,
      recipeId: null,
    });

    await expect(
      database.service.add(user, householdId, { name: 'Mjölk', quantity: 1, unit: 'l' }),
    ).rejects.toThrow('finns redan på listan');
    expect(database.transaction.shoppingListItem.create).not.toHaveBeenCalled();
  });

  it('prevents stale updates using the item version', async () => {
    const database = createDatabase();
    database.prisma.shoppingListItem.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      database.service.update(user, householdId, shoppingItemId, {
        name: 'Mjölk',
        quantity: null,
        unit: null,
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(database.prisma.shoppingListItem.findFirst).not.toHaveBeenCalled();
  });

  it('checks off an item without writing to inventory', async () => {
    const database = createDatabase();

    await expect(
      database.service.setPurchased(user, householdId, shoppingItemId, {
        isPurchased: true,
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(database.prisma.shoppingListItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isPurchased: true, version: { increment: 1 } },
      }),
    );
    expect(database.inventory.createPurchasedWithinTransaction).not.toHaveBeenCalled();
  });

  it('imports selected purchased items and records PURCHASED inventory in one transaction', async () => {
    const database = createDatabase();

    await expect(
      database.service.importToInventory(user, householdId, {
        items: [
          {
            shoppingListItemId: shoppingItemId,
            expectedVersion: 2,
            name: 'Mjölk',
            quantity: 1,
            unit: 'l',
            storageLocation: 'FRIDGE',
            expiryDate: null,
            expiryType: null,
            expirySource: null,
          },
        ],
      }),
    ).resolves.toEqual({ items: [{ id: 'inventory-id' }] });

    expect(database.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(database.transaction.shoppingListItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: shoppingItemId,
          isPurchased: true,
          transferredAt: null,
          version: 2,
        }),
      }),
    );
    expect(database.inventory.createPurchasedWithinTransaction).toHaveBeenCalledWith(
      database.transaction,
      householdId,
      expect.objectContaining({ name: 'Mjölk', quantity: 1, unit: 'l', storageLocation: 'FRIDGE' }),
      `shopping:${shoppingItemId}`,
    );
  });

  it('refuses a repeated or stale transfer without creating duplicate stock', async () => {
    const database = createDatabase();
    database.transaction.shoppingListItem.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      database.service.importToInventory(user, householdId, {
        items: [
          {
            shoppingListItemId: shoppingItemId,
            expectedVersion: 2,
            name: 'Mjölk',
            quantity: 1,
            unit: 'l',
            storageLocation: 'FRIDGE',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(database.inventory.createPurchasedWithinTransaction).not.toHaveBeenCalled();
  });

  it('uses the existing recipe match and only accepts missing, partial or explicitly reviewed unknown rows', async () => {
    const database = createDatabase();
    database.recipes.get.mockResolvedValue({
      id: recipeId,
      title: 'Pasta',
      ingredients: [{ id: recipeIngredientId, displayName: 'Pasta', availability: 'PARTIAL' }],
    });
    database.prisma.shoppingListItem.create.mockResolvedValue({
      id: shoppingItemId,
      name: 'Pasta',
      quantity: 300,
      unit: 'GRAM',
      isPurchased: false,
      recipeId,
      recipeTitle: 'Pasta',
      version: 0,
      createdAt: new Date('2026-11-15T12:00:00Z'),
      updatedAt: new Date('2026-11-15T12:00:00Z'),
    });
    database.prisma.shoppingListItem.findMany.mockResolvedValue([]);

    await database.service.addFromRecipe(user, householdId, {
      recipeId,
      items: [{ recipeIngredientId, name: 'Pasta', quantity: 300, unit: 'g' }],
    });

    expect(database.recipes.get).toHaveBeenCalledWith(user, recipeId, { householdId });
    expect(database.transaction.shoppingListItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quantity: 300, unit: 'GRAM', recipeIngredientId }),
      }),
    );
  });
});
