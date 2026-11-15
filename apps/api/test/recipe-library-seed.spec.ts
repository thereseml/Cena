import { Prisma } from '@prisma/client';
import { RECIPE_LIBRARY, canonicalIngredient, type SeedRecipe } from '../src/recipes/library';
import { recipeContentHash, SEED_SOURCE } from '../src/recipes/library/recipe-review';
import { publishLibrary, seedLibrary } from '../src/recipes/library/seed-library';

const selection = RECIPE_LIBRARY.slice(0, 2);

function stored(recipe: SeedRecipe) {
  return {
    ...structuredClone(recipe),
    id: recipe.slug,
    seedSource: SEED_SOURCE,
    status: 'DRAFT',
    contentHash: recipeContentHash(recipe),
    publishedAt: null as Date | null,
    ingredients: recipe.ingredients.map((row) => ({
      ...row,
      ingredientId: row.normalizedName,
      quantity: row.quantity === null ? null : new Prisma.Decimal(row.quantity),
      ingredient: {
        id: row.normalizedName,
        name: row.canonicalName,
        normalizedName: row.normalizedName,
      },
    })),
  };
}

function database(rows = selection.map(stored)) {
  const aliases = new Map<string, { ingredientId: string }>();
  const ingredients = new Map<string, { id: string; name: string; normalizedName: string }>();
  const tx = {
    recipe: {
      findUnique: jest.fn(
        async ({ where }: { where: { slug: string } }) =>
          rows.find((row) => row.slug === where.slug) ?? null,
      ),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    recipeIngredient: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    ingredient: {
      upsert: jest.fn(async ({ create }: { create: { name: string; normalizedName: string } }) => {
        const value = ingredients.get(create.normalizedName) ?? {
          ...create,
          id: create.normalizedName,
        };
        ingredients.set(create.normalizedName, value);
        return value;
      }),
      findUnique: jest.fn(
        async ({ where }: { where: { normalizedName: string } }) =>
          ingredients.get(where.normalizedName) ?? null,
      ),
    },
    ingredientAlias: {
      findUnique: jest.fn(
        async ({ where }: { where: { normalizedName: string } }) =>
          aliases.get(where.normalizedName) ?? null,
      ),
      create: jest.fn(
        async ({ data }: { data: { normalizedName: string; ingredientId: string } }) => {
          aliases.set(data.normalizedName, { ingredientId: data.ingredientId });
          return data;
        },
      ),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  return { tx, prisma, rows, aliases, ingredients };
}

describe('recipe library seed', () => {
  it('is idempotent after creating drafts, updating a draft and publishing it', async () => {
    const db = database([]);
    db.tx.recipe.create.mockImplementation(async ({ data }: { data: { slug: string } }) => {
      const source = selection.find((recipe) => recipe.slug === data.slug)!;
      db.rows.push(stored(source));
      return {};
    });
    db.tx.recipe.update.mockImplementation(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status: string; publishedAt: Date | null };
      }) => {
        const index = db.rows.findIndex((row) => row.id === where.id);
        if (data.status === 'DRAFT') db.rows[index] = stored(selection[index]!);
        else Object.assign(db.rows[index]!, data);
        return {};
      },
    );
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toMatchObject({ created: 2 });
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toMatchObject({ skipped: 2 });
    db.rows[0]!.title = 'Old draft';
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toMatchObject({ updated: 1 });
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toMatchObject({ skipped: 2 });
    const approval = selection.map((recipe) => ({
      slug: recipe.slug,
      contentHash: recipeContentHash(recipe),
    }));
    await expect(publishLibrary(db.prisma as never, approval, selection)).resolves.toEqual({
      published: 2,
      skipped: 0,
    });
    await expect(publishLibrary(db.prisma as never, approval, selection)).resolves.toEqual({
      published: 0,
      skipped: 2,
    });
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toMatchObject({ skipped: 2 });
  });

  it('creates only drafts in one serializable transaction', async () => {
    const db = database([]);
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toEqual({
      created: 2,
      updated: 0,
      skipped: 0,
    });
    expect(db.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
      timeout: 60_000,
    });
    expect(db.tx.recipe.create).toHaveBeenCalledTimes(2);
    expect(db.tx.recipe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: selection[0]!.slug,
        seedSource: SEED_SOURCE,
        status: 'DRAFT',
        publishedAt: null,
        contentHash: recipeContentHash(selection[0]!),
        ingredients: {
          create: expect.arrayContaining([
            expect.objectContaining({ sortOrder: 0, quantity: 600 }),
          ]),
        },
      }),
    });
    expect(db.tx.recipeIngredient.deleteMany).not.toHaveBeenCalled();
  });

  it('skips unchanged draft and published recipes and creates aliases only once', async () => {
    const db = database();
    db.rows[1]!.status = 'PUBLISHED';
    const expected = { created: 0, updated: 0, skipped: 2 };
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toEqual(expected);
    const aliasCount = db.tx.ingredientAlias.create.mock.calls.length;
    expect(aliasCount).toBeGreaterThan(60);
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toEqual(expected);
    expect(db.tx.ingredientAlias.create).toHaveBeenCalledTimes(aliasCount);
    expect(db.tx.recipe.update).not.toHaveBeenCalled();
    expect(db.tx.recipe.create).not.toHaveBeenCalled();
  });

  it('replaces only changed draft ingredients, preserving recipe identity', async () => {
    const db = database();
    db.rows[0]!.title = 'Outdated title';
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toEqual({
      created: 0,
      updated: 1,
      skipped: 1,
    });
    expect(db.tx.recipeIngredient.deleteMany).toHaveBeenCalledWith({
      where: { recipeId: selection[0]!.slug },
    });
    expect(db.tx.recipe.update).toHaveBeenCalledWith({
      where: { id: selection[0]!.slug },
      data: expect.objectContaining({ title: selection[0]!.title, status: 'DRAFT' }),
    });
    expect(db.tx.recipe.create).not.toHaveBeenCalled();
  });

  it('rejects the entire selection before writes when a later published recipe changes', async () => {
    const db = database();
    db.rows[0]!.title = 'Changed draft';
    db.rows[1]!.status = 'PUBLISHED';
    db.rows[1]!.ingredients[0]!.quantity = new Prisma.Decimal(1);
    await expect(seedLibrary(db.prisma as never, selection)).rejects.toThrow(
      'Published recipe changed',
    );
    expect(db.tx.recipe.update).not.toHaveBeenCalled();
    expect(db.tx.recipeIngredient.deleteMany).not.toHaveBeenCalled();
    expect(db.tx.ingredient.upsert).not.toHaveBeenCalled();
  });

  it('never takes ownership of foreign slugs even when content is identical', async () => {
    const db = database();
    db.rows[0]!.seedSource = 'another-import';
    await expect(seedLibrary(db.prisma as never, selection)).rejects.toThrow('foreign-owned');
    expect(db.tx.ingredient.upsert).not.toHaveBeenCalled();
  });

  it('rejects alias reassignment instead of overwriting it', async () => {
    const db = database();
    const alias = canonicalIngredient('milk').aliases[0]!;
    db.aliases.set(alias, { ingredientId: 'different-ingredient' });
    await expect(seedLibrary(db.prisma as never, selection)).rejects.toThrow('another ingredient');
    expect(db.aliases.get(alias)).toEqual({ ingredientId: 'different-ingredient' });
    expect(db.tx.recipe.update).not.toHaveBeenCalled();
  });

  it('keeps legacy receipt ingredients and self-named Product links while adding curated aliases', async () => {
    const db = database([]);
    const legacyIngredient = {
      id: 'legacy-purjo',
      name: 'PURJO',
      normalizedName: 'purjo',
      products: [
        {
          id: 'legacy-product',
          name: 'PURJO',
          normalizedName: 'purjo',
          ingredientId: 'legacy-purjo',
        },
      ],
    };
    const original = structuredClone(legacyIngredient);
    db.ingredients.set('purjo', legacyIngredient);

    await expect(seedLibrary(db.prisma as never, selection)).resolves.toMatchObject({ created: 2 });
    expect(db.ingredients.get('purjo')).toEqual(original);
    expect(db.ingredients.get('purjo')).toBe(legacyIngredient);
    expect(db.aliases.get('purjo')).toEqual({ ingredientId: 'purjolök' });
    expect(db.tx.recipe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: selection[1]!.slug,
        ingredients: {
          create: expect.arrayContaining([expect.objectContaining({ ingredientId: 'purjolök' })]),
        },
      }),
    });
    for (const [args] of db.tx.ingredient.upsert.mock.calls) {
      expect(args).toMatchObject({ update: {} });
    }
  });

  it('reuses an uppercase canonical ingredient without renaming it or changing Product links', async () => {
    const source = RECIPE_LIBRARY.find((recipe) =>
      recipe.ingredients.some((row) => row.normalizedName === 'mjölk'),
    )!;
    const db = database([]);
    const existing = {
      id: 'manual-milk',
      name: 'MJÖLK',
      normalizedName: 'mjölk',
      products: [{ id: 'milk-product', name: 'MJÖLK', ingredientId: 'manual-milk' }],
    };
    const original = structuredClone(existing);
    db.ingredients.set('mjölk', existing);

    await expect(seedLibrary(db.prisma as never, [source])).resolves.toMatchObject({ created: 1 });
    expect(db.ingredients.get('mjölk')).toEqual(original);
    expect(db.tx.ingredient.upsert).toHaveBeenCalledWith({
      where: { normalizedName: 'mjölk' },
      create: { name: 'Mjölk', normalizedName: 'mjölk' },
      update: {},
    });
    expect(db.aliases.get('mjölk')).toEqual({ ingredientId: 'manual-milk' });
    expect(db.tx.recipe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ingredients: {
          create: expect.arrayContaining([
            expect.objectContaining({ ingredientId: 'manual-milk', displayName: 'Mjölk' }),
          ]),
        },
      }),
    });
  });

  it('still rejects a conflicting curated alias when a legacy ingredient with that name exists', async () => {
    const db = database();
    db.ingredients.set('purjo', { id: 'legacy-purjo', name: 'PURJO', normalizedName: 'purjo' });
    db.aliases.set('purjo', { ingredientId: 'different-canonical' });
    await expect(seedLibrary(db.prisma as never, selection)).rejects.toThrow('another ingredient');
    expect(db.aliases.get('purjo')).toEqual({ ingredientId: 'different-canonical' });
    expect(db.tx.recipe.create).not.toHaveBeenCalled();
    expect(db.tx.recipe.update).not.toHaveBeenCalled();
  });

  it('propagates ingredient write failures from inside the transaction', async () => {
    const db = database([]);
    db.tx.ingredientAlias.create.mockRejectedValueOnce(new Error('write failed'));
    await expect(seedLibrary(db.prisma as never, selection)).rejects.toThrow('write failed');
    expect(db.tx.recipe.create).not.toHaveBeenCalled();
  });
});

describe('explicit publication', () => {
  const approval = selection.map((recipe) => ({
    slug: recipe.slug,
    contentHash: recipeContentHash(recipe),
  }));

  it('ignores mutable canonical display names during reseeding and publication but checks normalized identity', async () => {
    const db = database();
    for (const row of db.rows) {
      for (const ingredient of row.ingredients) {
        ingredient.ingredient.name = ingredient.ingredient.name.toLocaleUpperCase('sv-SE');
      }
    }
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toEqual({
      created: 0,
      updated: 0,
      skipped: 2,
    });
    await expect(publishLibrary(db.prisma as never, approval, selection)).resolves.toEqual({
      published: 2,
      skipped: 0,
    });

    db.tx.recipe.update.mockClear();
    db.rows[1]!.ingredients[0]!.ingredient.normalizedName = 'different-identity';
    await expect(publishLibrary(db.prisma as never, approval, selection)).rejects.toThrow(
      'seeded database content',
    );
    expect(db.tx.recipe.update).not.toHaveBeenCalled();
  });

  it('does not treat an Ingredient display-name change as changed published recipe content', async () => {
    const db = database();
    db.rows[0]!.status = 'PUBLISHED';
    db.rows[0]!.ingredients[0]!.ingredient.name = 'KYCKLINGFILÉ';
    await expect(seedLibrary(db.prisma as never, selection)).resolves.toMatchObject({ skipped: 2 });
    expect(db.tx.recipe.update).not.toHaveBeenCalled();
  });

  it('publishes only approved matching drafts in a single transaction', async () => {
    const db = database();
    await expect(
      publishLibrary(db.prisma as never, approval.slice(0, 1), selection),
    ).resolves.toEqual({ published: 1, skipped: 0 });
    expect(db.tx.recipe.update).toHaveBeenCalledTimes(1);
    expect(db.tx.recipe.update).toHaveBeenCalledWith({
      where: { id: selection[0]!.slug },
      data: { status: 'PUBLISHED', publishedAt: expect.any(Date) },
    });
    expect(db.tx.recipeIngredient.deleteMany).not.toHaveBeenCalled();
    expect(db.tx.ingredientAlias.create).not.toHaveBeenCalled();
  });

  it('does not update dates or rows already published with identical content', async () => {
    const db = database();
    db.rows.forEach((row) => {
      row.status = 'PUBLISHED';
      row.publishedAt = new Date('2026-01-01');
    });
    await expect(publishLibrary(db.prisma as never, approval, selection)).resolves.toEqual({
      published: 0,
      skipped: 2,
    });
    expect(db.tx.recipe.update).not.toHaveBeenCalled();
    expect(db.rows[0]!.publishedAt).toEqual(new Date('2026-01-01'));
  });

  it.each([
    { manifest: [] },
    { manifest: [{ slug: 'arbitrary', contentHash: 'a'.repeat(64) }] },
    { manifest: [{ ...approval[0]!, contentHash: 'a'.repeat(64) }] },
  ])('rejects empty, arbitrary or stale approval before connecting %#', async ({ manifest }) => {
    const db = database();
    await expect(publishLibrary(db.prisma as never, manifest, selection)).rejects.toThrow();
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['content', 'hash', 'ownership', 'missing'])(
    'aborts all publication when a later entry has invalid %s',
    async (mode) => {
      const db = database();
      if (mode === 'content') db.rows[1]!.instructions[0] = 'Manual database change';
      if (mode === 'hash') db.rows[1]!.contentHash = 'a'.repeat(64);
      if (mode === 'ownership') db.rows[1]!.seedSource = 'other';
      if (mode === 'missing') db.rows.pop();
      await expect(publishLibrary(db.prisma as never, approval, selection)).rejects.toThrow(
        'seeded database content',
      );
      expect(db.tx.recipe.update).not.toHaveBeenCalled();
    },
  );
});
