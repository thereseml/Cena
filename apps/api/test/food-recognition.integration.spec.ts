import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { FoodRecognitionResult, SaveInventoryItemInput } from '@cena/contracts';
import type { AuthenticatedRequest } from '../src/auth/authenticated-user';
import { SupabaseJwtGuard } from '../src/auth/supabase-jwt.guard';
import { FoodRecognitionModule } from '../src/food-recognition/food-recognition.module';
import { InventoryModule } from '../src/inventory/inventory.module';
import { PrismaModule, PrismaService } from '../src/prisma/prisma.module';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

const USER = { id: 'supabase-user-id', email: 'anna@example.com' };
const HOUSEHOLD_ID = '00000000-0000-4000-8000-000000000001';
const PNG_IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/cWQAAAAASUVORK5CYII=',
  'base64',
);
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

describe('food recognition and confirmed inventory integration', () => {
  let moduleRef: TestingModule;
  let api: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let createdItems: Array<Record<string, unknown>>;
  let inventoryEvents: Array<Record<string, unknown>>;
  let recognizeFood: jest.Mock;

  beforeAll(async () => {
    createdItems = [];
    inventoryEvents = [];
    recognizeFood = jest.fn().mockResolvedValue({
      items: [
        { name: 'Tomater', quantity: 4, unit: 'st', description: null, confidence: 'HIGH' },
        { name: 'Ägg', quantity: null, unit: null, description: null, confidence: 'MEDIUM' },
      ],
    });

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
          inventoryEvents.push(data);
          return data;
        }),
      },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'application-user-id' }) },
      householdMember: { findUnique: jest.fn().mockResolvedValue({ id: 'membership-id' }) },
      inventoryItem: {
        findMany: jest.fn(async ({ where }: { where: { createRequestId: { in: string[] } } }) =>
          createdItems.filter((item) =>
            where.createRequestId.in.includes(String(item.createRequestId)),
          ),
        ),
      },
      $transaction: jest.fn((callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
      ),
    };

    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, FoodRecognitionModule, InventoryModule],
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
      .overrideProvider('FOOD_RECOGNITION_PROVIDER')
      .useValue({ recognizeFood })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    api = moduleRef.createNestApplication();
    await api.listen(0, '127.0.0.1');
    apiUrl = await api.getUrl();
  });

  afterAll(async () => {
    await api.close();
    await moduleRef.close();
  });

  it('rejects unauthenticated image analysis', async () => {
    const response = await postImage();
    expect(response.status).toBe(401);
    expect(recognizeFood).not.toHaveBeenCalled();
  });

  it('analyzes an uploaded image without writing inventory, then atomically saves only approved items', async () => {
    const analysisResponse = await postImage('Bearer integration-test-token');
    expect(analysisResponse.status).toBe(201);
    const suggestions = (await analysisResponse.json()) as FoodRecognitionResult;
    expect(suggestions.items).toMatchObject([
      { name: 'Tomater', quantity: 4, unit: 'st', needsReview: true },
      { name: 'Ägg', quantity: null, unit: null, needsReview: true },
    ]);
    expect(recognizeFood).toHaveBeenCalledWith(
      { bytes: expect.any(Buffer), mimeType: 'image/png' },
      expect.any(AbortSignal),
    );
    expect(createdItems).toHaveLength(0);
    expect(inventoryEvents).toHaveLength(0);

    const confirmedItems = { items: [APPROVED_ITEM] };
    const saveResponse = await postApprovedItems(confirmedItems);
    expect(saveResponse.status).toBe(201);
    const saved = (await saveResponse.json()) as Array<{ id: string; name: string }>;
    expect(saved).toMatchObject([{ name: 'Körsbärstomater' }]);
    expect(createdItems).toHaveLength(1);
    expect(inventoryEvents).toHaveLength(1);

    const retryResponse = await postApprovedItems(confirmedItems);
    expect(retryResponse.status).toBe(201);
    expect(await retryResponse.json()).toMatchObject(saved);
    expect(createdItems).toHaveLength(1);
    expect(inventoryEvents).toHaveLength(1);
  });
});

async function postImage(authorization?: string): Promise<Response> {
  const form = new FormData();
  form.append('image', new Blob([PNG_IMAGE], { type: 'image/png' }), 'mat.png');
  return fetch(`${apiUrl}/api/v1/food-recognition/analyze`, {
    method: 'POST',
    headers: authorization ? { Authorization: authorization } : undefined,
    body: form,
  });
}

async function postApprovedItems(value: { items: SaveInventoryItemInput[] }): Promise<Response> {
  return fetch(`${apiUrl}/api/v1/households/${HOUSEHOLD_ID}/inventory/bulk`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer integration-test-token',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'integration:photo:batch-123',
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
