import { BadRequestException } from '@nestjs/common';
import { parseRecipeQuery, parseRecipeUnit } from '../src/recipes/recipe-validation';

const HOUSEHOLD = '00000000-0000-4000-8000-000000000001';

describe('recipe query validation', () => {
  it('defaults paging and parses all supported filters without mutating input', () => {
    expect(parseRecipeQuery({})).toEqual({ page: 1, pageSize: 20 });
    const input = {
      householdId: HOUSEHOLD,
      search: '  Tomat  ',
      mealCategory: 'DINNER',
      maxTotalMinutes: '30',
      page: '2',
      pageSize: '5',
    };
    expect(parseRecipeQuery(input, true)).toEqual({
      householdId: HOUSEHOLD,
      search: 'Tomat',
      mealCategory: 'DINNER',
      maxTotalMinutes: 30,
      page: 2,
      pageSize: 5,
    });
    expect(input.search).toBe('  Tomat  ');
  });

  it.each(['DINNER', 'LUNCH', 'BREAKFAST', 'SNACK'])('accepts category %s', (mealCategory) => {
    expect(parseRecipeQuery({ mealCategory }).mealCategory).toBe(mealCategory);
  });

  it('accepts inclusive numeric bounds and trims empty search', () => {
    expect(
      parseRecipeQuery({ page: '10000', pageSize: '50', maxTotalMinutes: '1440', search: '  ' }),
    ).toEqual({ page: 10000, pageSize: 50, maxTotalMinutes: 1440, search: '' });
    expect(parseRecipeQuery({ page: '1', pageSize: '1', maxTotalMinutes: '1' })).toMatchObject({
      page: 1,
      pageSize: 1,
      maxTotalMinutes: 1,
    });
  });

  it.each([null, undefined, [], 'page=1', 1, true])('rejects a non-object query %p', (query) => {
    expect(() => parseRecipeQuery(query)).toThrow(BadRequestException);
  });

  it.each([
    { status: 'DRAFT' },
    { orderBy: 'title' },
    { householdId: '' },
    { householdId: 'not-a-uuid' },
    { householdId: '00000000-0000-0000-0000-000000000000' },
    { householdId: [HOUSEHOLD] },
    { householdId: { equals: HOUSEHOLD } },
    { search: ['tomat', 'pasta'] },
    { search: 42 },
    { search: 'a'.repeat(101) },
    { mealCategory: 'dinner' },
    { mealCategory: 'toString' },
    { mealCategory: ['DINNER'] },
    { mealCategory: null },
  ])('rejects malformed or unsupported filters %p', (query) => {
    expect(() => parseRecipeQuery(query)).toThrow(BadRequestException);
  });

  it.each(['page', 'pageSize', 'maxTotalMinutes'])(
    'rejects malformed %s numbers and arrays',
    (field) => {
      for (const value of [
        '0',
        '-1',
        '1.5',
        '1e2',
        '1x',
        ' 1',
        '',
        'Infinity',
        '9007199254740992',
        ['1'],
        1,
        null,
        true,
        {},
      ]) {
        expect(() => parseRecipeQuery({ [field]: value })).toThrow(BadRequestException);
      }
    },
  );

  it.each([{ page: '10001' }, { pageSize: '51' }, { maxTotalMinutes: '1441' }])(
    'rejects values above bounds %p',
    (query) => {
      expect(() => parseRecipeQuery(query)).toThrow(BadRequestException);
    },
  );

  it('requires an explicit valid household for recommendations only', () => {
    expect(() => parseRecipeQuery({}, true)).toThrow(BadRequestException);
    expect(parseRecipeQuery({ householdId: HOUSEHOLD }, true).householdId).toBe(HOUSEHOLD);
    expect(() => parseRecipeQuery({})).not.toThrow();
  });
});

describe('stored recipe units', () => {
  it.each(['st', 'g', 'kg', 'ml', 'l', 'dl', 'msk', 'tsk'])('accepts %s', (unit) => {
    expect(parseRecipeUnit(unit)).toBe(unit);
  });
  it.each(['LITER', 'liter', 'cup', '', 'toString', '__proto__'])(
    'rejects unsupported %s',
    (unit) => {
      expect(() => parseRecipeUnit(unit)).toThrow('Invalid stored recipe unit');
    },
  );
});
