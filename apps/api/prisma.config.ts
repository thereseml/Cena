import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const url =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://user:password@localhost:5432/cena?schema=public';

// Local validation must never silently use a remote DIRECT_DATABASE_URL from dotenv.
if (
  process.env.PRISMA_LOCAL_ONLY === '1' &&
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)
) {
  throw new Error(
    'Local-only Prisma command refused a non-loopback database target. Set both database URLs explicitly.',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url,
  },
});
