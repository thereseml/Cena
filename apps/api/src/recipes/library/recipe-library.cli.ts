import { readFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { RECIPE_LIBRARY } from './index';
import { reviewLibrary, validateApprovalManifest, validateLibrary } from './recipe-review';
import { publishLibrary, seedLibrary } from './seed-library';

export async function runRecipeLibraryCli(args: readonly string[]): Promise<void> {
  const [command, ...options] = args;
  if (command === 'validate' && options.length === 0) {
    validateLibrary();
    console.log(`Valid: ${RECIPE_LIBRARY.length} recipe drafts. No database connection.`);
    return;
  }
  if (command === 'review' && options.length === 0) {
    process.stdout.write(reviewLibrary());
    return;
  }
  if (
    !(command === 'seed' && options.length === 0) &&
    !(
      command === 'publish' &&
      options.length === 2 &&
      options[0] === '--approval' &&
      options[1]?.trim()
    )
  ) {
    throw new Error(
      'Usage: recipe-library.cli.js validate | review | seed | publish --approval <path>',
    );
  }
  validateLibrary();
  const approvalPath = options[1];
  const approval =
    command === 'publish' && approvalPath
      ? validateApprovalManifest(JSON.parse(await readFile(approvalPath, 'utf8')) as unknown)
      : null;
  config({ quiet: true });
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for seed and publish');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const result =
      command === 'seed' ? await seedLibrary(prisma) : await publishLibrary(prisma, approval);
    console.log(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void runRecipeLibraryCli(process.argv.slice(2)).catch(() => {
    // Never echo DB connection errors, which may contain connection details.
    console.error(
      'Recipe library command failed. Check arguments, approval, content and database configuration.',
    );
    process.exitCode = 1;
  });
}
