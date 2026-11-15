import { PrismaClient } from '@prisma/client';
import { runRecipeLibraryCli } from '../src/recipes/library/recipe-library.cli';

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return { ...actual, PrismaClient: jest.fn() };
});

describe('recipe library CLI offline boundaries', () => {
  afterEach(() => jest.restoreAllMocks());

  it('validates without constructing a database client', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await runRecipeLibraryCli(['validate']);
    expect(log).toHaveBeenCalledWith('Valid: 50 recipe drafts. No database connection.');
    expect(PrismaClient).not.toHaveBeenCalled();
  });

  it('reviews without constructing a database client', async () => {
    const output = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runRecipeLibraryCli(['review']);
    expect(output).toHaveBeenCalledWith(expect.stringContaining('# Cena Recipe Library Review'));
    expect(PrismaClient).not.toHaveBeenCalled();
  });

  it.each(
    [
      [],
      ['publish'],
      ['publish', '--approval', ''],
      ['publish', '--all'],
      ['seed', '--publish'],
      ['validate', '--seed'],
      ['review', '--publish'],
      ['publish', '--approval', 'file.json', '--force'],
    ].map((args) => ({ args })),
  )('rejects unsafe or ambiguous arguments %# without database access', async ({ args }) => {
    await expect(runRecipeLibraryCli(args)).rejects.toThrow('Usage:');
    expect(PrismaClient).not.toHaveBeenCalled();
  });
});
