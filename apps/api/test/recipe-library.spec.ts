import {
  RECIPE_LIBRARY,
  INGREDIENT_CATALOG,
  canonicalIngredient,
  type SeedRecipe,
} from '../src/recipes/library';
import type { IngredientKey } from '../src/recipes/library/ingredients';
import { EVERYDAY_CHICKEN_FISH } from '../src/recipes/library/everyday-chicken-fish';
import { EVERYDAY_MEAT } from '../src/recipes/library/everyday-meat';
import { QUICK_RECIPES } from '../src/recipes/library/quick';
import { VEGETARIAN_RECIPES } from '../src/recipes/library/vegetarian';
import { BREAKFAST_SNACK_RECIPES } from '../src/recipes/library/breakfast-snacks';
import { SOUP_LUNCH_RECIPES } from '../src/recipes/library/soups-lunches';
import {
  recipeContentHash,
  reviewLibrary,
  validateApprovalManifest,
  validateLibrary,
} from '../src/recipes/library/recipe-review';
import { normalizeIngredientName } from '../src/recipes/recipe-normalization';

function sample(): SeedRecipe {
  return structuredClone(RECIPE_LIBRARY[0]!);
}

describe('recipe library content', () => {
  it('contains 50 valid original drafts in the requested exclusive groups', () => {
    expect(RECIPE_LIBRARY).toHaveLength(50);
    expect(EVERYDAY_CHICKEN_FISH.length + EVERYDAY_MEAT.length).toBe(20);
    expect(QUICK_RECIPES).toHaveLength(10);
    expect(VEGETARIAN_RECIPES).toHaveLength(10);
    expect(BREAKFAST_SNACK_RECIPES).toHaveLength(5);
    expect(SOUP_LUNCH_RECIPES).toHaveLength(5);
    expect(new Set(RECIPE_LIBRARY.map((recipe) => recipe.slug)).size).toBe(50);
    expect(new Set(RECIPE_LIBRARY.map((recipe) => recipe.title)).size).toBe(50);
    expect(() => validateLibrary()).not.toThrow();
    expect(QUICK_RECIPES.every((recipe) => recipe.totalMinutes <= 25)).toBe(true);
    expect(
      [...EVERYDAY_CHICKEN_FISH, ...EVERYDAY_MEAT].every(
        (recipe) => recipe.mealCategory === 'DINNER',
      ),
    ).toBe(true);
    expect(VEGETARIAN_RECIPES.every((recipe) => recipe.tags.includes('vegetariskt'))).toBe(true);
    expect(SOUP_LUNCH_RECIPES.every((recipe) => recipe.mealCategory === 'LUNCH')).toBe(true);
  });

  it('derives contiguous ingredient order and preserves dry/cooked preparation notes', () => {
    for (const recipe of RECIPE_LIBRARY) {
      expect(recipe.ingredients.map((ingredient) => ingredient.sortOrder)).toEqual(
        recipe.ingredients.map((_, i) => i),
      );
    }
    expect(
      QUICK_RECIPES[0]!.ingredients.find((row) => row.canonicalName === 'Vita bönor, kokta')
        ?.preparationNotes,
    ).toBe('avrunnen vikt');
  });

  it('uses exact Swedish normalization without stripping sizes, accents or punctuation', () => {
    expect(normalizeIngredientName('  MJÖLK\t  ')).toBe('mjölk');
    expect(normalizeIngredientName(' A\u0308GG ')).toBe('ägg');
    expect(normalizeIngredientName('mellanmjölk 1,5% 1l')).toBe('mellanmjölk 1,5% 1l');
    expect(canonicalIngredient('milk').aliases).toContain('mellanmj 1,5%');
    expect(canonicalIngredient('creme').aliases).toContain('cr fraiche');
    expect(canonicalIngredient('crushedTomato').aliases).toContain('kross tom');
    expect(canonicalIngredient('crushedTomato').aliases).toContain(
      normalizeIngredientName('TOMAT KROSS'),
    );
    expect(canonicalIngredient('chicken').aliases).toContain(normalizeIngredientName('KYCK FILÉ'));
    expect(canonicalIngredient('milk').aliases).not.toContain('mellanmjölk 1,5% 1l');
  });

  it.each([
    { key: 'garlic' as const, generic: 'vitlök', explicit: 'vitlöksklyftor' },
    { key: 'bread' as const, generic: 'fullkornsbröd', explicit: 'fullkornsbröd skivor' },
    { key: 'lasagnePlates' as const, generic: 'pasta', explicit: 'lasagneplattor torra' },
  ])('does not resolve generic $generic to $key', ({ key, generic, explicit }) => {
    const aliases = new Map<string, string>();
    for (const catalogKey of Object.keys(INGREDIENT_CATALOG) as IngredientKey[]) {
      const ingredient = canonicalIngredient(catalogKey);
      for (const name of [ingredient.normalizedName, ...ingredient.aliases]) {
        aliases.set(name, ingredient.normalizedName);
      }
    }
    const canonical = canonicalIngredient(key).normalizedName;
    expect(aliases.get(normalizeIngredientName(explicit))).toBe(canonical);
    expect(aliases.get(normalizeIngredientName(generic))).not.toBe(canonical);
    if (key !== 'lasagnePlates') expect(aliases.has(normalizeIngredientName(generic))).toBe(false);
  });

  it('uses lasagne plates rather than generic pasta in spinach lasagna', () => {
    const lasagna = RECIPE_LIBRARY.find((recipe) => recipe.slug === 'spenatlasagne-med-keso')!;
    expect(lasagna.ingredients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedName: 'lasagneplattor',
          canonicalName: 'Lasagneplattor',
          displayName: 'Lasagneplattor',
          quantity: 250,
          unit: 'g',
        }),
      ]),
    );
    expect(lasagna.ingredients.some((ingredient) => ingredient.normalizedName === 'pasta')).toBe(
      false,
    );
  });

  it.each([
    { key: 'garlic' as const, displayName: 'Vitlöksklyftor' },
    { key: 'bread' as const, displayName: 'Skivor fullkornsbröd' },
  ])('makes the counted form explicit in every $key recipe ingredient', ({ key, displayName }) => {
    const canonical = canonicalIngredient(key);
    const rows = RECIPE_LIBRARY.flatMap((recipe) => recipe.ingredients).filter(
      (ingredient) => ingredient.normalizedName === canonical.normalizedName,
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toMatchObject({ canonicalName: canonical.name, displayName, unit: 'st' });
    }
  });

  it.each([
    {
      key: 'chickpeas' as const,
      ambiguous: ['kikärter', 'kikärtor', 'kikärt'],
      explicit: 'kokta kikärter',
    },
    { key: 'beans' as const, ambiguous: ['vita bönor'], explicit: 'kokta vita bönor' },
    { key: 'kidney' as const, ambiguous: ['kidneybönor'], explicit: 'kokta kidneybönor' },
  ])('requires an explicit cooked form for $key aliases', ({ key, ambiguous, explicit }) => {
    const ingredient = canonicalIngredient(key);
    const names = [ingredient.normalizedName, ...ingredient.aliases];
    expect(names).toContain(explicit);
    for (const name of ambiguous) expect(names).not.toContain(name);
    expect(names.every((name) => name.includes('kokta'))).toBe(true);
  });

  it('hashes normalized identity and recipe display text, not the canonical display name', () => {
    const recipe = sample();
    const hash = recipeContentHash(recipe);
    recipe.ingredients[0]!.canonicalName = 'KYCKLINGFILÉ';
    expect(recipeContentHash(recipe)).toBe(hash);
    recipe.ingredients[0]!.normalizedName = 'different-identity';
    expect(recipeContentHash(recipe)).not.toBe(hash);
    recipe.ingredients[0]!.normalizedName = sample().ingredients[0]!.normalizedName;
    recipe.ingredients[0]!.displayName = 'Different recipe label';
    expect(recipeContentHash(recipe)).not.toBe(hash);
  });

  it('hashes explicit content deterministically regardless of property insertion order', () => {
    const recipe = sample();
    const reordered = Object.fromEntries(Object.entries(recipe).reverse()) as unknown as SeedRecipe;
    expect(recipeContentHash(reordered)).toBe(recipeContentHash(recipe));
    expect(recipeContentHash(recipe)).toMatch(/^[a-f0-9]{64}$/);
    expect(recipeContentHash({ ...recipe, title: recipe.title + '!' })).not.toBe(
      recipeContentHash(recipe),
    );
    const changedIngredient = sample();
    changedIngredient.ingredients[0]!.quantity = 601;
    expect(recipeContentHash(changedIngredient)).not.toBe(recipeContentHash(recipe));
    const changedSteps = sample();
    changedSteps.instructions.reverse();
    expect(recipeContentHash(changedSteps)).not.toBe(recipeContentHash(recipe));
  });

  it.each([0, -1, NaN, Infinity, 0.0001, 1_000_000_000])(
    'rejects invalid quantity %s',
    (quantity) => {
      const recipe = sample();
      recipe.ingredients[0]!.quantity = quantity;
      expect(() => validateLibrary([recipe])).toThrow('Quantity');
    },
  );

  it('allows a null quantity only with the explicit efter smak note', () => {
    const recipe = sample();
    recipe.ingredients[0]!.quantity = null;
    expect(() => validateLibrary([recipe])).toThrow('efter smak');
    recipe.ingredients[0]!.preparationNotes = 'efter smak';
    expect(() => validateLibrary([recipe])).not.toThrow();
    expect(reviewLibrary([recipe])).toContain('UNKNOWN / UNQUANTIFIED');
  });

  it('rejects duplicate slugs, invalid times, units, order and unknown canonical ingredients', () => {
    expect(() => validateLibrary([sample(), sample()])).toThrow('slug');
    expect(() => validateLibrary([{ ...sample(), totalMinutes: 0 }])).toThrow('times');
    expect(() => validateLibrary([{ ...sample(), servings: 0 }])).toThrow('servings');
    const recipe = sample();
    recipe.ingredients[0]!.sortOrder = 1;
    expect(() => validateLibrary([recipe])).toThrow('ingredient');
    recipe.ingredients[0]!.sortOrder = 0;
    recipe.ingredients[0]!.unit = 'package' as never;
    expect(() => validateLibrary([recipe])).toThrow('ingredient');
    recipe.ingredients[0]!.unit = 'g';
    recipe.ingredients[0]!.normalizedName = 'invented';
    expect(() => validateLibrary([recipe])).toThrow('ingredient');
  });

  it('renders every current recipe, hash, ingredient and instruction from source', () => {
    const review = reviewLibrary();
    for (const recipe of RECIPE_LIBRARY) {
      expect(review).toContain(recipe.title);
      expect(review).toContain(recipeContentHash(recipe));
      for (const step of recipe.instructions) expect(review).toContain(step);
      for (const ingredient of recipe.ingredients)
        expect(review).toContain(ingredient.normalizedName);
    }
    expect(review).toContain('Not physically test-cooked');
    expect(review).toContain('cr fraiche');
  });

  it.each(
    [
      null,
      [],
      {},
      ['slug'],
      [{ slug: 'x', contentHash: 'bad' }],
      [{ slug: 'x', contentHash: 'a'.repeat(64), approved: true }],
      [
        { slug: 'x', contentHash: 'a'.repeat(64) },
        { slug: 'x', contentHash: 'a'.repeat(64) },
      ],
    ].map((manifest) => ({ manifest })),
  )('rejects malformed or empty manifest %#', ({ manifest }) => {
    expect(() => validateApprovalManifest(manifest)).toThrow();
  });
});
