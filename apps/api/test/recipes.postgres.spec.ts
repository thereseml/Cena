import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { HouseholdsService } from '../src/households/households.service';
import { PrismaService } from '../src/prisma/prisma.module';
import { RECIPE_LIBRARY } from '../src/recipes/library';
import { recipeContentHash } from '../src/recipes/library/recipe-review';
import { publishLibrary, seedLibrary } from '../src/recipes/library/seed-library';
import { RecipesService } from '../src/recipes/recipes.service';

// Never fall back to DATABASE_URL, dotenv, Supabase or a developer's normal DB.
const databaseUrl = process.env.RECIPE_TEST_DATABASE_URL;
if (databaseUrl !== undefined) {
  const target = new URL(databaseUrl);
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.pathname !== '/cena_recipes_test' ||
    target.port !== '55439' ||
    target.search ||
    target.hash
  ) {
    throw new Error(
      'RECIPE_TEST_DATABASE_URL must target localhost:55439/cena_recipes_test without URL parameters',
    );
  }
}

const describeDatabase = databaseUrl === undefined ? describe.skip : describe;

describeDatabase('recipes isolated local PostgreSQL integration (explicit opt-in)', () => {
  let prisma: PrismaClient;
  let service: RecipesService;
  const userId = randomUUID();
  const householdId = randomUUID();
  const otherHouseholdId = randomUUID();
  const identity = { id: randomUUID(), email: 'recipes-postgres@example.invalid' };
  const outsiderId = randomUUID();
  const outsider = { id: randomUUID(), email: 'recipes-outsider@example.invalid' };
  const productId = randomUUID();
  const inventoryId = randomUUID();
  const archivedId = randomUUID();
  const foreignInventoryId = randomUUID();
  const runId = randomUUID();
  const fixtures = RECIPE_LIBRARY.slice(0, 2);
  const fixtureSlugs = fixtures.map((recipe) => recipe.slug);
  let fixtureIds: string[] = [];
  let initialSeed: Awaited<ReturnType<typeof seedLibrary>>;
  let existingSeedCount = 0;
  let publishedByTest = false;

  // This manifest is authorized for this private test database only, not editorial approval.
  const approvalManifest = fixtures.map((recipe) => ({
    slug: recipe.slug,
    contentHash: recipeContentHash(recipe),
  }));
  const publishFixtures = async () => {
    publishedByTest = true;
    expect(await publishLibrary(prisma, approvalManifest)).toEqual({ published: 2, skipped: 0 });
  };

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }) });
    await prisma.$connect();
    const target = await prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT current_database() AS name`;
    expect(target[0].name).toBe('cena_recipes_test');
    // Refuse to alter already published fixtures from another run or reviewer.
    const existing = await prisma.recipe.findMany({
      where: { slug: { in: RECIPE_LIBRARY.map((recipe) => recipe.slug) } },
    });
    expect(existing.every((recipe) => recipe.status === 'DRAFT')).toBe(true);
    existingSeedCount = existing.length;
    initialSeed = await seedLibrary(prisma);
    fixtureIds = (await prisma.recipe.findMany({ where: { slug: { in: fixtureSlugs } } })).map(
      (recipe) => recipe.id,
    );
    service = new RecipesService(
      prisma as PrismaService,
      new HouseholdsService(prisma as PrismaService),
    );

    await prisma.user.createMany({
      data: [
        {
          id: userId,
          supabaseAuthId: identity.id,
          email: identity.email,
          provisioningCompleted: true,
        },
        {
          id: outsiderId,
          supabaseAuthId: outsider.id,
          email: outsider.email,
          provisioningCompleted: true,
        },
      ],
    });
    await prisma.household.create({
      data: {
        id: householdId,
        name: `Recipe test ${runId}`,
        members: { create: { userId, role: 'OWNER' } },
      },
    });
    await prisma.household.create({
      data: {
        id: otherHouseholdId,
        name: `Other recipe test ${runId}`,
        members: { create: { userId: outsiderId } },
      },
    });
    const firstIngredient = fixtures[0].ingredients.find((row) => row.quantity !== null);
    if (!firstIngredient || firstIngredient.quantity === null)
      throw new Error('Fixture needs a quantified ingredient');
    const canonical = await prisma.ingredient.findUniqueOrThrow({
      where: { normalizedName: firstIngredient.normalizedName },
    });
    await prisma.product.create({
      data: {
        id: productId,
        ingredientId: canonical.id,
        name: 'Privat testprodukt',
        normalizedName: `recipe-test-${runId}`,
      },
    });
    const units = {
      st: 'PIECE',
      g: 'GRAM',
      kg: 'KILOGRAM',
      ml: 'MILLILITER',
      l: 'LITER',
      dl: 'MILLILITER',
      msk: 'MILLILITER',
      tsk: 'MILLILITER',
    } as const;
    const factors = { st: 1, g: 1, kg: 1, ml: 1, l: 1, dl: 100, msk: 15, tsk: 5 };
    for (const [id, owner, archivedAt] of [
      [inventoryId, householdId, null],
      [archivedId, householdId, new Date()],
      [foreignInventoryId, otherHouseholdId, null],
    ] as const) {
      await prisma.inventoryItem.create({
        data: {
          id,
          householdId: owner,
          createRequestId: `recipe-test-${id}`,
          productId,
          displayName: firstIngredient.displayName,
          unit: units[firstIngredient.unit],
          storageLocation: 'PANTRY',
          archivedAt,
          batches: {
            create: { quantity: (firstIngredient.quantity * factors[firstIngredient.unit]) / 2 },
          },
        },
      });
    }
  }, 90_000);

  afterEach(async () => {
    if (publishedByTest) {
      await prisma.recipe.updateMany({
        where: { id: { in: fixtureIds } },
        data: { status: 'DRAFT', publishedAt: null },
      });
      publishedByTest = false;
    }
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      if (publishedByTest)
        await prisma.recipe.updateMany({
          where: { id: { in: fixtureIds } },
          data: { status: 'DRAFT', publishedAt: null },
        });
      const ownInventory = [inventoryId, archivedId, foreignInventoryId];
      await prisma.inventoryEvent.deleteMany({ where: { inventoryItemId: { in: ownInventory } } });
      await prisma.productBatch.deleteMany({ where: { inventoryItemId: { in: ownInventory } } });
      await prisma.inventoryItem.deleteMany({ where: { id: { in: ownInventory } } });
      await prisma.product.deleteMany({ where: { id: productId } });
      await prisma.household.deleteMany({ where: { id: { in: [householdId, otherHouseholdId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userId, outsiderId] } } });
      // Seed drafts remain reusable. Never delete another run's library or catalog.
    } finally {
      await prisma.$disconnect();
    }
  });

  it('seeds 50 drafts once, skips all 50 on retry, and exposes no draft browse/detail records', async () => {
    expect(initialSeed).toEqual({
      created: 50 - existingSeedCount,
      updated: 0,
      skipped: existingSeedCount,
    });
    expect(await seedLibrary(prisma)).toEqual({ created: 0, updated: 0, skipped: 50 });
    const stored = await prisma.recipe.findMany({
      where: { slug: { in: RECIPE_LIBRARY.map((recipe) => recipe.slug) } },
    });
    expect(stored).toHaveLength(50);
    expect(stored.every((recipe) => recipe.status === 'DRAFT' && recipe.publishedAt === null)).toBe(
      true,
    );
    expect(await service.list(identity, {})).toMatchObject({ items: [], total: 0 });
    expect(await service.list(identity, { householdId }, true)).toMatchObject({
      items: [],
      total: 0,
    });
    await expect(service.get(identity, fixtureIds[0], {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  }, 90_000);

  it('rejects an altered approval hash and altered stored content atomically', async () => {
    const alteredHash = [{ ...approvalManifest[0], contentHash: '0'.repeat(64) }];
    await expect(publishLibrary(prisma, alteredHash)).rejects.toThrow(
      'Approval does not match current source',
    );
    const original = await prisma.recipe.findUniqueOrThrow({ where: { slug: fixtures[1].slug } });
    await prisma.recipe.update({
      where: { id: original.id },
      data: { title: `${original.title} altered` },
    });
    try {
      await expect(publishLibrary(prisma, approvalManifest)).rejects.toThrow(
        'Approval does not match seeded database content',
      );
      expect(
        await prisma.recipe.count({ where: { id: { in: fixtureIds }, status: 'PUBLISHED' } }),
      ).toBe(0);
    } finally {
      await prisma.recipe.update({ where: { id: original.id }, data: { title: original.title } });
    }
  });

  it('publishes only the explicitly approved fixtures and applies live title/category/time filters and stable pagination', async () => {
    await publishFixtures();
    expect(await publishLibrary(prisma, approvalManifest)).toEqual({ published: 0, skipped: 2 });
    const all = await service.list(identity, {});
    expect(all.total).toBe(2);
    expect(new Set(all.items.map((recipe) => recipe.slug))).toEqual(new Set(fixtureSlugs));
    const first = await service.list(identity, { page: '1', pageSize: '1' });
    const second = await service.list(identity, { page: '2', pageSize: '1' });
    expect([...first.items, ...second.items]).toEqual(all.items);
    expect(first.total).toBe(2);
    expect(second.total).toBe(2);
    expect((await service.list(identity, { page: '3', pageSize: '1' })).items).toEqual([]);
    const selected = fixtures[0];
    const filtered = await service.list(identity, {
      search: selected.title.toLocaleUpperCase('sv-SE'),
      mealCategory: selected.mealCategory,
      maxTotalMinutes: String(selected.totalMinutes),
    });
    expect(filtered.items.map((recipe) => recipe.slug)).toEqual([selected.slug]);
    expect(
      (
        await service.list(identity, {
          search: selected.title,
          maxTotalMinutes: String(selected.totalMinutes - 1),
        })
      ).total,
    ).toBe(0);
    const wrongCategory = selected.mealCategory === 'SNACK' ? 'DINNER' : 'SNACK';
    expect(
      (await service.list(identity, { search: selected.title, mealCategory: wrongCategory })).total,
    ).toBe(0);
    const draft = await prisma.recipe.findFirstOrThrow({ where: { status: 'DRAFT' } });
    await expect(service.get(identity, draft.id, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('matches only active authorized inventory in list, detail and recommendations without any persisted mutation', async () => {
    await publishFixtures();
    const selected = await prisma.recipe.findUniqueOrThrow({ where: { slug: fixtures[0].slug } });
    const beforeItems = await prisma.inventoryItem.findMany({
      where: { id: { in: [inventoryId, archivedId, foreignInventoryId] } },
      include: { batches: true },
      orderBy: { id: 'asc' },
    });
    const eventCount = await prisma.inventoryEvent.count({
      where: { householdId: { in: [householdId, otherHouseholdId] } },
    });
    const plain = await service.get(identity, selected.id, {});
    expect(plain.availability).toBeNull();
    expect(plain.ingredients.every((row) => row.availability === null)).toBe(true);
    const detail = await service.get(identity, selected.id, { householdId });
    const quantified = detail.ingredients.find((row) => row.quantity !== null);
    expect(quantified).toMatchObject({ availability: 'PARTIAL', reason: 'INSUFFICIENT' });
    expect(quantified?.availableQuantity).toBe((quantified?.quantity ?? 0) / 2);
    const page = await service.list(identity, { householdId });
    expect(page.items.find((recipe) => recipe.id === selected.id)?.availability).toEqual(
      detail.availability,
    );
    expect((await service.list(identity, { householdId }, true)).total).toBe(2);
    await expect(service.get(outsider, selected.id, { householdId })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.list(outsider, { householdId })).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.list(identity, { householdId: otherHouseholdId }, true),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      await prisma.inventoryItem.findMany({
        where: { id: { in: [inventoryId, archivedId, foreignInventoryId] } },
        include: { batches: true },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(beforeItems);
    expect(
      await prisma.inventoryEvent.count({
        where: { householdId: { in: [householdId, otherHouseholdId] } },
      }),
    ).toBe(eventCount);
  });

  it.each([
    { servings: 0 },
    { preparationMinutes: -1 },
    { totalMinutes: 1 },
    { status: 'PUBLISHED' as const, publishedAt: null },
  ])('rejects invalid recipe constraints in a rolled-back create %p', async (invalidFields) => {
    const slug = `constraint-${randomUUID()}`;
    const { ingredients: _ingredients, ...source } = fixtures[0];
    void _ingredients;
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.recipe.create({
          data: { ...source, slug, contentHash: recipeContentHash(fixtures[0]), ...invalidFields },
        });
        throw new Error('Unexpectedly accepted invalid recipe');
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(await prisma.recipe.count({ where: { slug } })).toBe(0);
  });

  it.each([
    { quantity: 0 },
    { quantity: -1 },
    { unit: 'cup' },
    { sortOrder: -1 },
    { quantity: null, preparationNotes: null },
  ])(
    'rejects invalid ingredient constraints without persisting a recipe %p',
    async (invalidFields) => {
      const slug = `ingredient-constraint-${randomUUID()}`;
      const ingredient = await prisma.ingredient.findFirstOrThrow();
      const { ingredients: _ingredients, ...source } = fixtures[0];
      void _ingredients;
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.recipe.create({
            data: {
              ...source,
              slug,
              contentHash: recipeContentHash(fixtures[0]),
              ingredients: {
                create: {
                  ingredientId: ingredient.id,
                  displayName: 'Test',
                  quantity: 1,
                  unit: 'g',
                  sortOrder: 0,
                  ...invalidFields,
                },
              },
            },
          });
          throw new Error('Unexpectedly accepted invalid ingredient');
        }),
      ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect(await prisma.recipe.count({ where: { slug } })).toBe(0);
    },
  );

  it('enforces unique recipe slugs and ingredient positions with transaction rollback', async () => {
    const original = await prisma.recipe.findUniqueOrThrow({
      where: { slug: fixtures[0].slug },
      include: { ingredients: true },
    });
    const { ingredients: _ingredients, ...source } = fixtures[0];
    void _ingredients;
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.recipe.create({
          data: { ...source, contentHash: recipeContentHash(fixtures[0]) },
        });
        throw new Error('Unexpectedly accepted duplicate slug');
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    const row = original.ingredients[0];
    const count = await prisma.recipeIngredient.count({ where: { recipeId: original.id } });
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.recipeIngredient.create({
          data: {
            recipeId: original.id,
            ingredientId: row.ingredientId,
            displayName: 'Test',
            quantity: 1,
            unit: 'g',
            sortOrder: row.sortOrder,
          },
        });
        throw new Error('Unexpectedly accepted duplicate ingredient position');
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.recipeIngredient.count({ where: { recipeId: original.id } })).toBe(count);
  });

  it('rejects dangling ingredient references and duplicate exact aliases', async () => {
    const recipe = await prisma.recipe.findUniqueOrThrow({ where: { slug: fixtures[0].slug } });
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: randomUUID(),
            displayName: 'Test',
            quantity: 1,
            unit: 'g',
            sortOrder: 999,
          },
        });
        throw new Error('Unexpectedly accepted dangling ingredient');
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    const alias = await prisma.ingredientAlias.findFirstOrThrow();
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.ingredientAlias.create({
          data: { normalizedName: alias.normalizedName, ingredientId: alias.ingredientId },
        });
        throw new Error('Unexpectedly accepted duplicate alias');
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
