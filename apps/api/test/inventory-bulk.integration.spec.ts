import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { SaveInventoryItemInput } from '@cena/contracts';
import type { AuthenticatedRequest } from '../src/auth/authenticated-user';
import { SupabaseJwtGuard } from '../src/auth/supabase-jwt.guard';
import { InventoryModule } from '../src/inventory/inventory.module';
import { PrismaModule, PrismaService } from '../src/prisma/prisma.module';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

const USER = { id: 'supabase-user-id', email: 'anna@example.com' };
const HOUSEHOLD_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_HOUSEHOLD_ID = '00000000-0000-4000-8000-000000000002';
const APPROVED_ITEM: SaveInventoryItemInput = {
  name: 'Körsbärstomater',
  quantity: 3,
  unit: 'st',
  storageLocation: 'PANTRY',
  expiryDate: null,
  expiryType: null,
  expirySource: null,
};
let apiUrl: string;

describe('confirmed bulk inventory HTTP integration', () => {
  let moduleRef: TestingModule;
  let api: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let createdItems: Array<Record<string, unknown>>;
  let inventoryEvents: Array<Record<string, unknown>>;
  let failEventAt: number | undefined;
  let transactionCalls: number;
  let replayQueries: number;

  beforeAll(async () => {
    createdItems = [];
    inventoryEvents = [];

    const transaction = {
      ingredient: {
        upsert: jest.fn().mockResolvedValue({ id: 'ingredient-id' }),
      },
      product: {
        upsert: jest.fn().mockResolvedValue({ id: 'product-id' }),
      },
      inventoryItem: {
        create: jest.fn(async ({ data }: { data: InventoryCreateData }) => {
          const item = createInventoryRow(data, createdItems.length);
          createdItems.push(item);
          return item;
        }),
      },
      inventoryEvent: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          if (inventoryEvents.length === failEventAt) throw new Error('Test event write failure');
          inventoryEvents.push(data);
          return data;
        }),
      },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'application-user-id' }) },
      householdMember: {
        findUnique: jest.fn(async ({ where }: {
          where: { householdId_userId: { householdId: string } };
        }) => where.householdId_userId.householdId === HOUSEHOLD_ID
          ? { id: 'membership-id' }
          : null),
      },
      inventoryItem: {
        findMany: jest.fn(async ({ where }: {
          where: { householdId: string; createRequestId: { startsWith: string } };
        }) => {
          replayQueries += 1;
          return createdItems.filter((item) =>
            item.householdId === where.householdId &&
            String(item.createRequestId).startsWith(where.createRequestId.startsWith),
          );
        }),
      },
      $transaction: jest.fn(async (callback: (client: typeof transaction) => Promise<unknown>) => {
        transactionCalls += 1;
        const itemCount = createdItems.length;
        const eventCount = inventoryEvents.length;
        try {
          return await callback(transaction);
        } catch (error) {
          // Model transaction rollback without connecting to a live database.
          createdItems.length = itemCount;
          inventoryEvents.length = eventCount;
          throw error;
        }
      }),
    };

    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, InventoryModule],
    })
      .overrideGuard(SupabaseJwtGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
          if (request.headers.authorization !== 'Bearer integration-test-token') {
            throw new UnauthorizedException();
          }
          request.user = USER;
          return true;
        },
      })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    api = moduleRef.createNestApplication();
    api.useLogger(false);
    await api.listen(0, '127.0.0.1');
    apiUrl = await api.getUrl();
  });

  beforeEach(() => {
    createdItems.length = 0;
    inventoryEvents.length = 0;
    failEventAt = undefined;
    transactionCalls = 0;
    replayQueries = 0;
  });

  afterAll(async () => {
    await api.close();
    await moduleRef.close();
  });

  it('rejects unauthenticated bulk writes before accessing inventory', async () => {
    const response = await postApprovedItems({ items: [APPROVED_ITEM] }, { authorization: '' });
    expect(response.status).toBe(401);
    expect(replayQueries).toBe(0);
    expect(transactionCalls).toBe(0);
    expect(createdItems).toHaveLength(0);
    expect(inventoryEvents).toHaveLength(0);
  });

  it('rejects another household before reading or writing inventory', async () => {
    const response = await postApprovedItems(
      { items: [APPROVED_ITEM] }, { householdId: OTHER_HOUSEHOLD_ID },
    );
    expect(response.status).toBe(404);
    expect(replayQueries).toBe(0);
    expect(transactionCalls).toBe(0);
    expect(createdItems).toHaveLength(0);
    expect(inventoryEvents).toHaveLength(0);
  });

  it('saves only confirmed items in one transaction and replays without duplicate events', async () => {
    const confirmedItems = {
      items: [APPROVED_ITEM, { ...APPROVED_ITEM, name: 'Pasta', quantity: 500, unit: 'g' as const }],
    };
    const saveResponse = await postApprovedItems(confirmedItems);
    expect(saveResponse.status).toBe(201);
    const saved = (await saveResponse.json()) as Array<{ id: string; name: string }>;
    expect(saved).toMatchObject([{ name: 'Körsbärstomater' }, { name: 'Pasta' }]);
    expect(transactionCalls).toBe(1);
    expect(createdItems).toHaveLength(2);
    expect(inventoryEvents).toMatchObject([
      { householdId: HOUSEHOLD_ID, eventType: 'ADDED', quantityDelta: 3, unit: 'PIECE' },
      { householdId: HOUSEHOLD_ID, eventType: 'ADDED', quantityDelta: 500, unit: 'GRAM' },
    ]);

    const retryResponse = await postApprovedItems(confirmedItems);
    expect(retryResponse.status).toBe(201);
    expect(await retryResponse.json()).toMatchObject(saved);
    expect(createdItems).toHaveLength(2);
    expect(inventoryEvents).toHaveLength(2);
    expect(transactionCalls).toBe(1);
  });

  it('validates every item before starting a transaction', async () => {
    const response = await postApprovedItems({
      items: [APPROVED_ITEM, { ...APPROVED_ITEM, quantity: 0 }],
    });
    expect(response.status).toBe(400);
    expect(transactionCalls).toBe(0);
    expect(createdItems).toHaveLength(0);
    expect(inventoryEvents).toHaveLength(0);
  });

  it('rolls back the whole batch if an event write fails and allows a clean retry', async () => {
    const confirmedItems = { items: [APPROVED_ITEM, { ...APPROVED_ITEM, name: 'Pasta' }] };
    failEventAt = 1;
    const response = await postApprovedItems(confirmedItems);
    expect(response.status).toBe(500);
    expect(transactionCalls).toBe(1);
    expect(createdItems).toHaveLength(0);
    expect(inventoryEvents).toHaveLength(0);

    failEventAt = undefined;
    const retryResponse = await postApprovedItems(confirmedItems);
    expect(retryResponse.status).toBe(201);
    expect(createdItems).toHaveLength(2);
    expect(inventoryEvents).toHaveLength(2);
  });

  it('rejects reusing a confirmed batch key with changed data', async () => {
    await postApprovedItems({ items: [APPROVED_ITEM] });
    const response = await postApprovedItems({ items: [{ ...APPROVED_ITEM, quantity: 7 }] });
    expect(response.status).toBe(409);
    expect(transactionCalls).toBe(1);
    expect(createdItems).toHaveLength(1);
    expect(inventoryEvents).toHaveLength(1);
  });

  it.each([
    [2, 1],
    [1, 2],
  ])('rejects changing batch length from %i to %i with the same key', async (firstCount, retryCount) => {
    const items = [APPROVED_ITEM, { ...APPROVED_ITEM, name: 'Pasta' }];
    const firstResponse = await postApprovedItems({ items: items.slice(0, firstCount) });
    expect(firstResponse.status).toBe(201);

    const retryResponse = await postApprovedItems({ items: items.slice(0, retryCount) });
    expect(retryResponse.status).toBe(409);
    expect(transactionCalls).toBe(1);
    expect(createdItems).toHaveLength(firstCount);
    expect(inventoryEvents).toHaveLength(firstCount);
  });
});

async function postApprovedItems(
  value: { items: SaveInventoryItemInput[] },
  options: { householdId?: string; authorization?: string } = {},
): Promise<Response> {
  return fetch(`${apiUrl}/api/v1/households/${options.householdId ?? HOUSEHOLD_ID}/inventory/bulk`, {
    method: 'POST',
    headers: {
      Authorization: options.authorization ?? 'Bearer integration-test-token',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'integration:bulk:batch-123',
    },
    body: JSON.stringify(value),
  });
}

interface InventoryCreateData {
  householdId: string;
  createRequestId: string;
  displayName: string;
  unit: string;
  storageLocation: string;
  batches: {
    create: {
      quantity: number;
      expiryDate: Date | null;
      expiryType: string | null;
      expirySource: string | null;
    };
  };
}

function createInventoryRow(data: InventoryCreateData, index: number): Record<string, unknown> {
  const batchInput = data.batches.create;
  const createdAt = new Date('2026-11-14T12:00:00.000Z');
  const batch = {
    id: `batch-${index}`,
    quantity: { toString: () => String(batchInput.quantity) },
    expiryDate: batchInput.expiryDate,
    expiryType: batchInput.expiryType,
    expirySource: batchInput.expirySource,
    createdAt,
  };
  return {
    id: `inventory-${index}`,
    householdId: data.householdId,
    createRequestId: data.createRequestId,
    displayName: data.displayName,
    unit: data.unit,
    storageLocation: data.storageLocation,
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
    version: 0,
    product: { name: data.displayName },
    batches: [batch],
  };
}
