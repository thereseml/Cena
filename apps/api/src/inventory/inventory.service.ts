import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { InventoryItem as InventoryItemContract } from '@cena/contracts';
import {
  ExpirySource,
  ExpiryType,
  InventoryEventType,
  Prisma,
  StorageLocation,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { AuthenticatedUser } from '../auth/authenticated-user';
import {
  dateFromDatabase,
  dateToDatabase,
  parseExpectedVersion,
  parseIdempotencyKey,
  parseInventoryInput,
  parseInventoryInputs,
  unitFromDatabase,
  unitToDatabase,
} from './inventory-validation';

const EXPIRY_TYPE_TO_DATABASE = {
  BEST_BEFORE: ExpiryType.BEST_BEFORE,
  USE_BY: ExpiryType.USE_BY,
} as const;
const EXPIRY_SOURCE_TO_DATABASE = {
  USER_ENTERED: ExpirySource.USER_ENTERED,
  ESTIMATED: ExpirySource.ESTIMATED,
} as const;
const STORAGE_LOCATION_TO_DATABASE = {
  FRIDGE: StorageLocation.FRIDGE,
  FREEZER: StorageLocation.FREEZER,
  PANTRY: StorageLocation.PANTRY,
} as const;
type InventoryItemWithBatches = Prisma.InventoryItemGetPayload<{
  include: { product: true; batches: true };
}>;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, householdId: string): Promise<InventoryItemContract[]> {
    await this.authorizeHousehold(user.id, householdId);
    const items = await this.prisma.inventoryItem.findMany({
      where: { householdId, archivedAt: null },
      include: { product: true, batches: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return items.map((item) => this.toContract(item));
  }

  async get(
    user: AuthenticatedUser,
    householdId: string,
    itemId: string,
  ): Promise<InventoryItemContract> {
    await this.authorizeHousehold(user.id, householdId);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, householdId, archivedAt: null },
      include: { product: true, batches: { orderBy: { createdAt: 'asc' } } },
    });
    if (!item) throw this.itemNotFound();
    return this.toContract(item);
  }

  async create(
    user: AuthenticatedUser,
    householdId: string,
    value: unknown,
    requestKey: unknown,
  ): Promise<InventoryItemContract> {
    await this.authorizeHousehold(user.id, householdId);
    const input = parseInventoryInput(value);
    const createRequestId = parseIdempotencyKey(requestKey);
    const replay = await this.findCreateReplay(householdId, createRequestId);
    if (replay) return this.returnCreateReplay(replay, input);

    try {
      return await this.prisma.$transaction((transaction) =>
        this.createInventoryItem(transaction, householdId, input, createRequestId),
      );
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      const concurrentReplay = await this.findCreateReplay(householdId, createRequestId);
      if (!concurrentReplay) throw error;
      return this.returnCreateReplay(concurrentReplay, input);
    }
  }

  async createMany(
    user: AuthenticatedUser,
    householdId: string,
    value: unknown,
    requestKey: unknown,
  ): Promise<InventoryItemContract[]> {
    await this.authorizeHousehold(user.id, householdId);
    const inputs = parseInventoryInputs(value);
    const batchRequestId = parseIdempotencyKey(requestKey);
    const requestIds = inputs.map((_, index) => bulkItemRequestId(batchRequestId, index));
    const replay = await this.findBulkReplay(householdId, requestIds);
    if (replay.length > 0) return this.returnBulkReplay(replay, inputs, requestIds);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const created: InventoryItemContract[] = [];
        for (let index = 0; index < inputs.length; index += 1) {
          created.push(
            await this.createInventoryItem(
              transaction,
              householdId,
              inputs[index],
              requestIds[index],
            ),
          );
        }
        return created;
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      const concurrentReplay = await this.findBulkReplay(householdId, requestIds);
      return this.returnBulkReplay(concurrentReplay, inputs, requestIds);
    }
  }

  private async createInventoryItem(
    transaction: Prisma.TransactionClient,
    householdId: string,
    input: ReturnType<typeof parseInventoryInput>,
    createRequestId: string,
  ): Promise<InventoryItemContract> {
    const normalizedName = normalizeName(input.name);
    const ingredient = await transaction.ingredient.upsert({
      where: { normalizedName },
      create: { name: input.name, normalizedName },
      update: {},
    });
    const product = await transaction.product.upsert({
      where: { normalizedName },
      create: { ingredientId: ingredient.id, name: input.name, normalizedName },
      update: { ingredientId: ingredient.id },
    });
    const item = await transaction.inventoryItem.create({
      data: {
        householdId,
        createRequestId,
        productId: product.id,
        displayName: input.name,
        unit: unitToDatabase(input.unit),
        storageLocation: STORAGE_LOCATION_TO_DATABASE[input.storageLocation],
        batches: {
          create: {
            quantity: input.quantity,
            expiryDate: dateToDatabase(input.expiryDate),
            expiryType: input.expiryType ? EXPIRY_TYPE_TO_DATABASE[input.expiryType] : null,
            expirySource: input.expirySource ? EXPIRY_SOURCE_TO_DATABASE[input.expirySource] : null,
          },
        },
      },
      include: { product: true, batches: true },
    });
    await transaction.inventoryEvent.create({
      data: {
        householdId,
        inventoryItemId: item.id,
        productBatchId: item.batches[0].id,
        eventType: InventoryEventType.ADDED,
        quantityDelta: input.quantity,
        unit: unitToDatabase(input.unit),
      },
    });
    return this.toContract(item);
  }

  private findBulkReplay(householdId: string, requestIds: string[]) {
    return this.prisma.inventoryItem.findMany({
      where: { householdId, createRequestId: { in: requestIds } },
      include: { product: true, batches: { orderBy: { createdAt: 'asc' } } },
    });
  }

  private returnBulkReplay(
    foundItems: InventoryItemWithBatches[],
    inputs: ReturnType<typeof parseInventoryInput>[],
    requestIds: string[],
  ): InventoryItemContract[] {
    if (foundItems.length !== requestIds.length) {
      throw new ConflictException('Begäran om att lägga till varor har redan delvis använts.');
    }
    const itemsByRequestId = new Map(foundItems.map((item) => [item.createRequestId, item]));
    return requestIds.map((requestId, index) => {
      const item = itemsByRequestId.get(requestId);
      if (!item)
        throw new ConflictException('Begäran om att lägga till varor kunde inte bekräftas.');
      return this.returnCreateReplay(item, inputs[index]);
    });
  }

  async update(
    user: AuthenticatedUser,
    householdId: string,
    itemId: string,
    value: unknown,
  ): Promise<InventoryItemContract> {
    await this.authorizeHousehold(user.id, householdId);
    const input = parseInventoryInput(value, { allowEstimated: true });
    const expectedVersion = parseExpectedVersion(value);
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.inventoryItem.findFirst({
        where: { id: itemId, householdId, archivedAt: null },
        include: { batches: true },
      });
      if (!existing) throw this.itemNotFound();
      if (existing.version !== expectedVersion) {
        throw new ConflictException('Varan har ändrats. Läs in den igen innan du sparar.');
      }
      if (existing.batches.length !== 1) {
        throw new ConflictException('Varans partier kunde inte uppdateras. Försök igen.');
      }
      const currentBatch = existing.batches[0];
      if (
        input.expirySource === 'ESTIMATED' &&
        !(
          currentBatch.expirySource === ExpirySource.ESTIMATED &&
          dateFromDatabase(currentBatch.expiryDate) === input.expiryDate &&
          currentBatch.expiryType ===
            (input.expiryType ? EXPIRY_TYPE_TO_DATABASE[input.expiryType] : null)
        )
      ) {
        throw new BadRequestException('Uppskattade datum kan bara bevaras tills vidare.');
      }

      const normalizedName = normalizeName(input.name);
      const ingredient = await transaction.ingredient.upsert({
        where: { normalizedName },
        create: { name: input.name, normalizedName },
        update: {},
      });
      const product = await transaction.product.upsert({
        where: { normalizedName },
        create: { ingredientId: ingredient.id, name: input.name, normalizedName },
        update: { ingredientId: ingredient.id },
      });
      const oldQuantity = sumBatchQuantities(existing.batches);
      const oldUnit = unitFromDatabase(existing.unit);
      const quantityDelta =
        (Math.round(input.quantity * 1000) - Math.round(oldQuantity * 1000)) / 1000;
      const updatedCount = await transaction.inventoryItem.updateMany({
        where: {
          id: existing.id,
          householdId,
          archivedAt: null,
          version: expectedVersion,
        },
        data: {
          productId: product.id,
          displayName: input.name,
          unit: unitToDatabase(input.unit),
          storageLocation: STORAGE_LOCATION_TO_DATABASE[input.storageLocation],
          version: { increment: 1 },
        },
      });
      if (updatedCount.count !== 1) {
        throw new ConflictException('Varan har ändrats. Läs in den igen innan du sparar.');
      }
      await transaction.productBatch.update({
        where: { id: existing.batches[0].id },
        data: {
          quantity: input.quantity,
          expiryDate: dateToDatabase(input.expiryDate),
          expiryType: input.expiryType ? EXPIRY_TYPE_TO_DATABASE[input.expiryType] : null,
          expirySource: input.expirySource ? EXPIRY_SOURCE_TO_DATABASE[input.expirySource] : null,
        },
      });
      const updated = await transaction.inventoryItem.findFirst({
        where: { id: existing.id, householdId, archivedAt: null },
        include: { product: true, batches: true },
      });
      if (!updated) throw this.itemNotFound();
      const adjustmentEvents =
        oldUnit === input.unit
          ? [{ quantityDelta, unit: unitToDatabase(input.unit) }]
          : [
              { quantityDelta: -oldQuantity, unit: unitToDatabase(oldUnit) },
              { quantityDelta: input.quantity, unit: unitToDatabase(input.unit) },
            ];
      await transaction.inventoryEvent.createMany({
        data: adjustmentEvents.map((adjustment) => ({
          householdId,
          inventoryItemId: itemId,
          productBatchId: existing.batches[0].id,
          eventType: InventoryEventType.ADJUSTED,
          ...adjustment,
        })),
      });
      return this.toContract(updated);
    });
  }

  async remove(
    user: AuthenticatedUser,
    householdId: string,
    itemId: string,
    value: unknown,
  ): Promise<void> {
    await this.authorizeHousehold(user.id, householdId);
    const expectedVersion = parseExpectedVersion(value);
    await this.prisma.$transaction(async (transaction) => {
      const item = await transaction.inventoryItem.findFirst({
        where: { id: itemId, householdId, archivedAt: null },
        include: { batches: true },
      });
      if (!item) throw this.itemNotFound();

      if (item.version !== expectedVersion) {
        throw new ConflictException('Varan har ändrats. Läs in den igen innan du tar bort den.');
      }
      const archivedCount = await transaction.inventoryItem.updateMany({
        where: { id: item.id, householdId, archivedAt: null, version: expectedVersion },
        data: { archivedAt: new Date(), version: { increment: 1 } },
      });
      if (archivedCount.count !== 1) {
        throw new ConflictException('Varan har ändrats. Läs in den igen innan du tar bort den.');
      }
      await transaction.inventoryEvent.create({
        data: {
          householdId,
          inventoryItemId: item.id,
          productBatchId: item.batches.length === 1 ? item.batches[0].id : null,
          eventType: InventoryEventType.REMOVED,
          quantityDelta: -sumBatchQuantities(item.batches),
          unit: item.unit,
        },
      });
    });
  }

  private async authorizeHousehold(supabaseAuthId: string, householdId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseAuthId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Hushållet kunde inte hittas.');
    const membership = await this.prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId, userId: user.id } },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('Hushållet kunde inte hittas.');
  }

  private itemNotFound(): NotFoundException {
    return new NotFoundException('Varan kunde inte hittas.');
  }

  private findCreateReplay(householdId: string, createRequestId: string) {
    return this.prisma.inventoryItem.findFirst({
      where: { householdId, createRequestId },
      include: { product: true, batches: { orderBy: { createdAt: 'asc' } } },
    });
  }

  private returnCreateReplay(
    item: InventoryItemWithBatches,
    input: ReturnType<typeof parseInventoryInput>,
  ): InventoryItemContract {
    if (item.archivedAt !== null) {
      throw new ConflictException('Den tidigare varan är borttagen. Lägg till den igen.');
    }
    const batch = item.batches[0];
    const matchesRequest =
      item.displayName === input.name &&
      item.batches.length === 1 &&
      sumBatchQuantities(item.batches) === input.quantity &&
      unitFromDatabase(item.unit) === input.unit &&
      item.storageLocation === STORAGE_LOCATION_TO_DATABASE[input.storageLocation] &&
      dateFromDatabase(batch?.expiryDate ?? null) === input.expiryDate &&
      batch?.expiryType === (input.expiryType ? EXPIRY_TYPE_TO_DATABASE[input.expiryType] : null) &&
      batch?.expirySource ===
        (input.expirySource ? EXPIRY_SOURCE_TO_DATABASE[input.expirySource] : null);
    if (!matchesRequest) {
      throw new ConflictException('Begärannyckeln har redan använts för en annan vara.');
    }
    return this.toContract(item);
  }

  private toContract(item: {
    id: string;
    displayName: string;
    unit: Parameters<typeof unitFromDatabase>[0];
    storageLocation: keyof typeof STORAGE_LOCATION_TO_DATABASE;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    product: { name: string };
    batches: Array<{
      id: string;
      quantity: { toString(): string };
      expiryDate: Date | null;
      expiryType: ExpiryType | null;
      expirySource: ExpirySource | null;
    }>;
  }): InventoryItemContract {
    return {
      id: item.id,
      name: item.displayName,
      quantity: sumBatchQuantities(item.batches),
      unit: unitFromDatabase(item.unit),
      storageLocation: item.storageLocation,
      batches: item.batches.map((batch) => ({
        id: batch.id,
        quantity: Number(batch.quantity.toString()),
        expiryDate: dateFromDatabase(batch.expiryDate),
        expiryType: batch.expiryType,
        expirySource: batch.expirySource,
      })),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      version: item.version,
    };
  }
}

function sumBatchQuantities(batches: Array<{ quantity: { toString(): string } }>): number {
  const thousandths = batches.reduce(
    (sum, batch) => sum + Math.round(Number(batch.quantity.toString()) * 1000),
    0,
  );
  return thousandths / 1000;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv-SE');
}

function bulkItemRequestId(requestId: string, index: number): string {
  const fingerprint = createHash('sha256').update(requestId).digest('hex').slice(0, 32);
  return `bulk:${fingerprint}:${index}`;
}
