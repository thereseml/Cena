import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryEventType, StorageLocation, InventoryUnit } from '@prisma/client';
import { InventoryService } from '../src/inventory/inventory.service';

const user = { id: 'supabase-user-id', email: 'anna@example.com' };
const householdId = '00000000-0000-4000-8000-000000000001';
const itemId = '00000000-0000-4000-8000-000000000002';
const batchId = '00000000-0000-4000-8000-000000000003';
const batch = {
  id: batchId,
  quantity: { toString: () => '1.5' },
  expiryDate: new Date('2026-11-20T00:00:00.000Z'),
  expiryType: 'BEST_BEFORE' as const,
  expirySource: 'USER_ENTERED' as const,
  createdAt: new Date('2026-11-13T12:00:00.000Z'),
};
const item = {
  id: itemId,
  householdId,
  createRequestId: 'request-key-123456',
  displayName: 'Mjölk',
  quantity: { toString: () => '1.5' },
  unit: InventoryUnit.LITER,
  storageLocation: StorageLocation.FRIDGE,
  archivedAt: null,
  createdAt: new Date('2026-11-13T12:00:00.000Z'),
  updatedAt: new Date('2026-11-13T12:00:00.000Z'),
  version: 0,
  product: { name: 'Mjölk' },
  batches: [batch],
};
const input = {
  name: 'Mjölk',
  quantity: 1.5,
  unit: 'l',
  storageLocation: 'FRIDGE',
  expiryDate: '2026-11-20',
  expiryType: 'BEST_BEFORE',
  expirySource: 'USER_ENTERED',
};
const requestKey = 'request-key-123456';

function createDatabase() {
  const transaction = {
    ingredient: {
      upsert: jest.fn().mockResolvedValue({ id: 'ingredient-id' }),
    },
    product: {
      upsert: jest.fn().mockResolvedValue({ id: 'product-id' }),
    },
    inventoryItem: {
      create: jest.fn().mockResolvedValue({ ...item, product: { name: 'Mjölk' } }),
      findFirst: jest.fn().mockResolvedValue(item),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    productBatch: { update: jest.fn().mockResolvedValue(batch) },
    inventoryEvent: {
      create: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'application-user-id' }) },
    householdMember: {
      findUnique: jest.fn().mockResolvedValue({ id: 'membership-id' }),
    },
    inventoryItem: {
      findMany: jest.fn().mockResolvedValue([item]),
      findFirst: jest.fn().mockResolvedValue(item),
    },
    $transaction: jest.fn(async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  };
  return { prisma, transaction };
}

describe('InventoryService', () => {
  it('creates a household item, batch and positive added event in one transaction', async () => {
    const database = createDatabase();
    database.prisma.inventoryItem.findFirst.mockResolvedValue(null);
    const service = new InventoryService(database.prisma as never);

    await expect(service.create(user, householdId, input, requestKey)).resolves.toMatchObject({
      id: itemId,
      name: 'Mjölk',
      quantity: 1.5,
      unit: 'l',
      storageLocation: 'FRIDGE',
      batches: [{ expiryDate: '2026-11-20', expirySource: 'USER_ENTERED' }],
    });
    expect(database.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(database.transaction.inventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          householdId,
          createRequestId: requestKey,
          displayName: 'Mjölk',
          batches: expect.objectContaining({ create: expect.objectContaining({ quantity: 1.5 }) }),
        }),
      }),
    );
    expect(database.transaction.inventoryEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        householdId,
        inventoryItemId: itemId,
        productBatchId: batchId,
        eventType: InventoryEventType.ADDED,
        quantityDelta: 1.5,
        unit: InventoryUnit.LITER,
      }),
    });
  });

  it('returns the original result for a duplicate add request without recording another event', async () => {
    const database = createDatabase();
    const service = new InventoryService(database.prisma as never);

    await expect(service.create(user, householdId, input, requestKey)).resolves.toMatchObject({
      id: itemId,
      quantity: 1.5,
    });

    expect(database.prisma.$transaction).not.toHaveBeenCalled();
    expect(database.transaction.inventoryEvent.create).not.toHaveBeenCalled();
  });

  it('rejects reusing an add request key for different item data', async () => {
    const database = createDatabase();
    const service = new InventoryService(database.prisma as never);

    await expect(
      service.create(user, householdId, { ...input, quantity: 2 }, requestKey),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(database.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not report a successful create replay for an archived item', async () => {
    const database = createDatabase();
    database.prisma.inventoryItem.findFirst.mockResolvedValue({ ...item, archivedAt: new Date() });
    const service = new InventoryService(database.prisma as never);

    await expect(service.create(user, householdId, input, requestKey)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(database.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lists only active inventory for a verified household membership', async () => {
    const database = createDatabase();
    const service = new InventoryService(database.prisma as never);

    await service.list(user, householdId);

    expect(database.prisma.householdMember.findUnique).toHaveBeenCalledWith({
      where: { householdId_userId: { householdId, userId: 'application-user-id' } },
      select: { id: true },
    });
    expect(database.prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { householdId, archivedAt: null } }),
    );
  });

  it('does not query inventory for a non-member household', async () => {
    const database = createDatabase();
    database.prisma.householdMember.findUnique.mockResolvedValue(null);
    const service = new InventoryService(database.prisma as never);

    await expect(service.list(user, householdId)).rejects.toBeInstanceOf(NotFoundException);
    expect(database.prisma.inventoryItem.findMany).not.toHaveBeenCalled();
  });

  it('authorizes the household before validating a create payload', async () => {
    const database = createDatabase();
    database.prisma.householdMember.findUnique.mockResolvedValue(null);
    const service = new InventoryService(database.prisma as never);

    await expect(service.create(user, householdId, null, undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(database.prisma.inventoryItem.findFirst).not.toHaveBeenCalled();
  });

  it('authorizes the household before validating an update payload', async () => {
    const database = createDatabase();
    database.prisma.householdMember.findUnique.mockResolvedValue(null);
    const service = new InventoryService(database.prisma as never);

    await expect(service.update(user, householdId, itemId, null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(database.prisma.inventoryItem.findFirst).not.toHaveBeenCalled();
  });

  it('authorizes the household before validating a remove payload', async () => {
    const database = createDatabase();
    database.prisma.householdMember.findUnique.mockResolvedValue(null);
    const service = new InventoryService(database.prisma as never);

    await expect(service.remove(user, householdId, itemId, null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(database.prisma.inventoryItem.findFirst).not.toHaveBeenCalled();
  });

  it('returns not found for an item outside the requested household', async () => {
    const database = createDatabase();
    database.prisma.inventoryItem.findFirst.mockResolvedValue(null);
    const service = new InventoryService(database.prisma as never);

    await expect(service.get(user, householdId, itemId)).rejects.toBeInstanceOf(NotFoundException);
    expect(database.prisma.inventoryItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: itemId, householdId, archivedAt: null } }),
    );
  });

  it('records an adjustment delta when the quantity changes', async () => {
    const database = createDatabase();
    const service = new InventoryService(database.prisma as never);

    await service.update(user, householdId, itemId, {
      ...input,
      expectedVersion: 0,
      quantity: 2,
    });

    expect(database.transaction.inventoryEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventType: InventoryEventType.ADJUSTED,
          quantityDelta: 0.5,
          unit: InventoryUnit.LITER,
        }),
      ],
    });
  });

  it('records an adjustment with zero delta for metadata-only edits', async () => {
    const database = createDatabase();
    const service = new InventoryService(database.prisma as never);

    await service.update(user, householdId, itemId, { ...input, expectedVersion: 0 });

    expect(database.transaction.inventoryEvent.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ eventType: InventoryEventType.ADJUSTED, quantityDelta: 0 })],
    });
  });

  it('rejects a concurrent edit that loses the conditional version update', async () => {
    const database = createDatabase();
    database.transaction.inventoryItem.updateMany.mockResolvedValue({ count: 0 });
    const service = new InventoryService(database.prisma as never);

    await expect(
      service.update(user, householdId, itemId, { ...input, expectedVersion: 0 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(database.transaction.productBatch.update).not.toHaveBeenCalled();
    expect(database.transaction.inventoryEvent.createMany).not.toHaveBeenCalled();
  });

  it('archives instead of deleting and records REMOVED rather than DISCARDED', async () => {
    const database = createDatabase();
    const service = new InventoryService(database.prisma as never);

    await service.remove(user, householdId, itemId, { expectedVersion: 0 });

    expect(database.transaction.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: { id: itemId, householdId, archivedAt: null, version: 0 },
      data: { archivedAt: expect.any(Date), version: { increment: 1 } },
    });
    expect(database.transaction.inventoryEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: InventoryEventType.REMOVED,
        quantityDelta: -1.5,
        unit: InventoryUnit.LITER,
      }),
    });
  });

  it('refuses to update an item with several batches rather than corrupting their quantities', async () => {
    const database = createDatabase();
    database.transaction.inventoryItem.findFirst.mockResolvedValue({
      ...item,
      batches: [batch, { ...batch, id: 'another-batch' }],
    });
    const service = new InventoryService(database.prisma as never);

    await expect(
      service.update(user, householdId, itemId, { ...input, expectedVersion: 0 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(database.transaction.inventoryItem.updateMany).not.toHaveBeenCalled();
  });

  it('rejects stale edits so concurrent household members do not overwrite each other', async () => {
    const database = createDatabase();
    database.transaction.inventoryItem.findFirst.mockResolvedValue({ ...item, version: 1 });
    const service = new InventoryService(database.prisma as never);

    await expect(
      service.update(user, householdId, itemId, { ...input, expectedVersion: 0 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(database.transaction.inventoryItem.updateMany).not.toHaveBeenCalled();
  });

  it('records unit changes as separate negative and positive deltas in their own units', async () => {
    const database = createDatabase();
    const service = new InventoryService(database.prisma as never);

    await service.update(user, householdId, itemId, {
      ...input,
      expectedVersion: 0,
      quantity: 500,
      unit: 'ml',
    });

    expect(database.transaction.inventoryEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ quantityDelta: -1.5, unit: InventoryUnit.LITER }),
        expect.objectContaining({ quantityDelta: 500, unit: InventoryUnit.MILLILITER }),
      ],
    });
  });

  it('rejects a removal based on stale inventory version', async () => {
    const database = createDatabase();
    database.transaction.inventoryItem.findFirst.mockResolvedValue({ ...item, version: 1 });
    const service = new InventoryService(database.prisma as never);

    await expect(
      service.remove(user, householdId, itemId, { expectedVersion: 0 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(database.transaction.inventoryItem.updateMany).not.toHaveBeenCalled();
  });
});
