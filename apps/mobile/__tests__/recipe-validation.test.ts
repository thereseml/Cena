import { parseRecipeDetail, parseRecipePage } from '../features/recipes/recipe-validation';
import {
  ALL_AVAILABLE_RECIPE,
  RECIPE_FIXTURE,
  RECIPE_PAGE,
  UNKNOWN_RECIPE,
} from '../features/recipes/recipe-fixtures';

it('parses valid pages, empty pages and all detail availability states', () => {
  expect(parseRecipePage(RECIPE_PAGE)).toEqual(RECIPE_PAGE);
  expect(parseRecipePage({ ...RECIPE_PAGE, items: [], total: 0 }).items).toEqual([]);
  for (const recipe of [RECIPE_FIXTURE, ALL_AVAILABLE_RECIPE, UNKNOWN_RECIPE]) {
    expect(parseRecipeDetail(recipe)).toEqual(recipe);
  }
});

it.each([
  null,
  undefined,
  [],
  'recipes',
  {},
  { ...RECIPE_PAGE, items: null },
  { ...RECIPE_PAGE, items: [null] },
  { ...RECIPE_PAGE, page: 0 },
  { ...RECIPE_PAGE, page: 1.5 },
  { ...RECIPE_PAGE, pageSize: 0 },
  { ...RECIPE_PAGE, pageSize: Infinity },
  { ...RECIPE_PAGE, total: -1 },
  { ...RECIPE_PAGE, total: NaN },
  { ...RECIPE_PAGE, total: '1' },
])('rejects malformed page %#', (response) => {
  expect(() => parseRecipePage(response)).toThrow('Invalid recipe page response');
});

it.each<[string, unknown]>([
  ['id', null],
  ['slug', {}],
  ['title', ['Pasta']],
  ['description', 5],
  ['mealCategory', 'SUPPER'],
  ['preparationMinutes', Infinity],
  ['cookingMinutes', -1],
  ['totalMinutes', NaN],
  ['servings', 0],
  ['tags', null],
  ['tags', [{}]],
  ['availability', {}],
  ['availability', { ...RECIPE_FIXTURE.availability, unknown: '1' }],
  ['availability', { ...RECIPE_FIXTURE.availability, available: -1 }],
  ['availability', { ...RECIPE_FIXTURE.availability, partial: 0.5 }],
])('rejects invalid summary field %s (%#) in both pages and details', (field, value) => {
  const recipe = { ...RECIPE_FIXTURE, [field]: value };
  expect(() => parseRecipePage({ ...RECIPE_PAGE, items: [recipe] })).toThrow();
  expect(() => parseRecipeDetail(recipe)).toThrow();
});

it.each<[string, unknown]>([
  ['id', null],
  ['displayName', {}],
  ['quantity', '200'],
  ['quantity', NaN],
  ['unit', 'cup'],
  ['preparationNotes', []],
  ['sortOrder', -1],
  ['availability', 'ENOUGH'],
  ['reason', 'SAFE'],
  ['availableQuantity', Infinity],
  ['missingQuantity', -1],
  ['missingQuantity', undefined],
])('rejects invalid ingredient field %s (%#)', (field, value) => {
  const ingredient = { ...RECIPE_FIXTURE.ingredients[0], [field]: value };
  expect(() => parseRecipeDetail({ ...RECIPE_FIXTURE, ingredients: [ingredient] })).toThrow();
});

it.each([
  null,
  [],
  {},
  { ...RECIPE_FIXTURE, ingredients: null },
  { ...RECIPE_FIXTURE, ingredients: [null] },
  { ...RECIPE_FIXTURE, instructions: 'Koka pastan' },
  { ...RECIPE_FIXTURE, instructions: [{}] },
])('rejects malformed detail %#', (response) => {
  expect(() => parseRecipeDetail(response)).toThrow('Invalid recipe detail response');
});
