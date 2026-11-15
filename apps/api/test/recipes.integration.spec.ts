import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { jwtVerify } from 'jose';
import { AuthModule } from '../src/auth/auth.module';
import { SupabaseJwtGuard } from '../src/auth/supabase-jwt.guard';
import { PrismaModule, PrismaService } from '../src/prisma/prisma.module';
import { RecipesModule } from '../src/recipes/recipes.module';

jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(() => jest.fn()), jwtVerify: jest.fn() }));

const HOUSEHOLD = '00000000-0000-4000-8000-000000000001';
const OTHER_HOUSEHOLD = '00000000-0000-4000-8000-000000000002';
const RECIPE = '00000000-0000-4000-8000-000000000010';
const row = {
  id: RECIPE,
  slug: 'tomatsoppa',
  title: 'Tomatsoppa',
  description: 'En enkel soppa.',
  mealCategory: 'DINNER',
  preparationMinutes: 10,
  cookingMinutes: 20,
  totalMinutes: 30,
  servings: 2,
  tags: ['vardag'],
  instructions: ['Koka soppan.'],
  ingredients: [
    {
      id: 'ingredient-row',
      ingredientId: 'tomato',
      displayName: 'Tomat',
      quantity: new Prisma.Decimal(2),
      unit: 'st',
      preparationNotes: null,
      sortOrder: 0,
    },
  ],
};

describe('recipes HTTP with actual module and authentication wiring', () => {
  let moduleRef: TestingModule;
  let api: ReturnType<TestingModule['createNestApplication']>;
  let url: string;
  const previousIssuer = process.env.SUPABASE_JWT_ISSUER;
  const previousJwks = process.env.SUPABASE_JWKS_URL;
  const prisma = {
    user: { findUnique: jest.fn() },
    householdMember: { findUnique: jest.fn() },
    recipe: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    inventoryItem: { findMany: jest.fn(), update: jest.fn() },
    ingredientAlias: { findMany: jest.fn() },
    inventoryEvent: { create: jest.fn() },
    productBatch: { update: jest.fn() },
    $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
  };

  beforeAll(async () => {
    process.env.SUPABASE_JWT_ISSUER = 'https://auth.recipe-test.invalid/auth/v1';
    process.env.SUPABASE_JWKS_URL =
      'https://auth.recipe-test.invalid/auth/v1/.well-known/jwks.json';
    moduleRef = await Test.createTestingModule({ imports: [PrismaModule, RecipesModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    api = moduleRef.createNestApplication();
    api.useLogger(false);
    await api.listen(0, '127.0.0.1');
    url = `${await api.getUrl()}/api/v1/recipes`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'identity', email: 'recipe-test@example.com', role: 'authenticated' },
      protectedHeader: { alg: 'ES256' },
    } as Awaited<ReturnType<typeof jwtVerify>>);
    prisma.user.findUnique.mockResolvedValue({ id: 'application-user' });
    prisma.householdMember.findUnique.mockImplementation(
      async ({ where }: { where: { householdId_userId: { householdId: string } } }) =>
        where.householdId_userId.householdId === HOUSEHOLD
          ? {
              id: 'membership',
              role: 'OWNER',
              household: {
                id: HOUSEHOLD,
                name: 'Testhushåll',
                createdAt: new Date('2026-11-15T12:00:00Z'),
              },
            }
          : null,
    );
    prisma.recipe.findMany.mockResolvedValue([row]);
    prisma.recipe.count.mockResolvedValue(3);
    prisma.recipe.findFirst.mockResolvedValue(row);
    prisma.inventoryItem.findMany.mockResolvedValue([]);
    prisma.ingredientAlias.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    expect(prisma.productBatch.update).not.toHaveBeenCalled();
    expect(prisma.inventoryEvent.create).not.toHaveBeenCalled();
    expect(prisma.recipe.update).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await api?.close();
    if (previousIssuer === undefined) delete process.env.SUPABASE_JWT_ISSUER;
    else process.env.SUPABASE_JWT_ISSUER = previousIssuer;
    if (previousJwks === undefined) delete process.env.SUPABASE_JWKS_URL;
    else process.env.SUPABASE_JWKS_URL = previousJwks;
  });

  const get = (path = '', authorization = 'Bearer local-test-token') =>
    fetch(`${url}${path}`, { headers: { Authorization: authorization } });

  it('imports AuthModule and resolves its real guard without replacing it', () => {
    expect(moduleRef.select(AuthModule).get(SupabaseJwtGuard, { strict: true })).toBeInstanceOf(
      SupabaseJwtGuard,
    );
  });

  it.each(['', `/${RECIPE}`, `/recommendations?householdId=${HOUSEHOLD}`])(
    'returns 401 before data access for unauthenticated %s',
    async (path) => {
      expect((await get(path, '')).status).toBe(401);
      expect(jwtVerify).not.toHaveBeenCalled();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.recipe.findMany).not.toHaveBeenCalled();
      expect(prisma.recipe.findFirst).not.toHaveBeenCalled();
      expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
    },
  );

  it('returns 401 for a rejected token rather than falling through to the service', async () => {
    jest.mocked(jwtVerify).mockRejectedValueOnce(new Error('invalid test token'));
    expect((await get()).status).toBe(401);
    expect(prisma.recipe.findMany).not.toHaveBeenCalled();
  });

  it('parses paging, title/category/time filters and enforces publication for list and count', async () => {
    const response = await get(
      '?search=Tomat&mealCategory=DINNER&maxTotalMinutes=30&page=2&pageSize=1',
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 3,
      items: [{ id: RECIPE, availability: null }],
    });
    const where = {
      status: 'PUBLISHED',
      title: { contains: 'Tomat', mode: 'insensitive' },
      mealCategory: 'DINNER',
      totalMinutes: { lte: 30 },
    };
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 1, take: 1 }),
    );
    expect(prisma.recipe.count).toHaveBeenCalledWith({ where });
  });

  it('enforces publication in detail and returns 404 for missing/draft records', async () => {
    const response = await get(`/${RECIPE}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: RECIPE,
      ingredients: [{ quantity: 2, availability: null }],
    });
    expect(prisma.recipe.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: RECIPE, status: 'PUBLISHED' } }),
    );
    prisma.recipe.findFirst.mockResolvedValueOnce(null);
    expect((await get(`/${RECIPE}`)).status).toBe(404);
  });

  it.each(['', `/${RECIPE}`, '/recommendations'])(
    'returns 404 before recipe and inventory queries for another household on %s',
    async (path) => {
      expect((await get(`${path}?householdId=${OTHER_HOUSEHOLD}`)).status).toBe(404);
      expect(prisma.householdMember.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            householdId_userId: { householdId: OTHER_HOUSEHOLD, userId: 'application-user' },
          },
        }),
      );
      expect(prisma.recipe.findMany).not.toHaveBeenCalled();
      expect(prisma.recipe.findFirst).not.toHaveBeenCalled();
      expect(prisma.recipe.count).not.toHaveBeenCalled();
      expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
      expect(prisma.ingredientAlias.findMany).not.toHaveBeenCalled();
    },
  );

  it('routes recommendations before UUID detail and loads only authorized active inventory', async () => {
    const response = await get(`/recommendations?householdId=${HOUSEHOLD}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      items: [{ availability: { missing: 1, total: 1 } }],
    });
    expect(prisma.recipe.findFirst).not.toHaveBeenCalled();
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PUBLISHED' } }),
    );
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { householdId: HOUSEHOLD, archivedAt: null } }),
    );
  });

  it('includes household availability in detail without leaking internal ingredient identities', async () => {
    const response = await get(`/${RECIPE}?householdId=${HOUSEHOLD}`);
    expect(response.status).toBe(200);
    const detail = (await response.json()) as { ingredients: Array<Record<string, unknown>> };
    expect(detail).toMatchObject({
      availability: { missing: 1, total: 1 },
      ingredients: [{ availability: 'MISSING', reason: 'NOT_FOUND', missingQuantity: 2 }],
    });
    expect(detail.ingredients[0]).not.toHaveProperty('ingredientId');
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { householdId: HOUSEHOLD, archivedAt: null } }),
    );
  });

  it.each([
    '/not-a-uuid',
    '?page=0',
    '?pageSize=51',
    '?page=1&page=2',
    '?search=a&search=b',
    '?householdId=invalid',
    '?mealCategory=toString',
    '?mealCategory=DINNER&mealCategory=LUNCH',
    '?maxTotalMinutes=1e2',
    '?status=DRAFT',
    '/recommendations',
  ])('returns 400 for malformed HTTP input %s before data queries', async (path) => {
    expect((await get(path)).status).toBe(400);
    expect(prisma.recipe.findMany).not.toHaveBeenCalled();
    expect(prisma.recipe.findFirst).not.toHaveBeenCalled();
    expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
  });
});
