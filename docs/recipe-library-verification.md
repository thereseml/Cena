# Recipe Library Verification

Date: 2026-11-15. Branch: `feat/recipe-library`. No merge approval is implied.

## Migration Incident

During implementation, the command intended to migrate an isolated local
database supplied `DATABASE_URL` only. Existing Prisma configuration prioritizes
`DIRECT_DATABASE_URL`, which dotenv loaded from the project environment file.
Consequently, `20261115120000_recipe_library` was applied to the configured remote
Supabase database **without the required separate authorization**.

This is an execution error, not an approved deployment. The migration creates
recipe/recipe-ingredient/alias tables, enums, indexes, checks and RLS; it does not
update or delete existing inventory data. No seed or publication command was run
against that target at the time of the incident. No remote rollback or table
deletion was attempted. The remote database and its data have not been
independently audited by this implementation, so absence of impact beyond the
migration is not claimed as an independently verified operational finding.

The follow-up migration `20261115130000_recipe_unquantified_ingredients` was
applied **only locally**. The already applied first migration was not rewritten.
The product owner must decide separately how to reconcile the remote schema and
handle any operational review; do not automatically apply the follow-up or delete
the new tables. This incident remains open for owner review.

Prevention added: `db:migrate:local` sets `PRISMA_LOCAL_ONLY=1`; Prisma config checks
the actually selected URL and refuses non-loopback targets before connecting.
Offline regression tests cover a remote direct URL overriding a local runtime
URL. Local migration commands now set both URLs explicitly, as documented in
[recipes.md](recipes.md#local-verification).

After the product owner explicitly requested recipe insertion, the configured
Supabase database was checked read-only: the recipe table existed and contained
zero rows. The owner-authorized idempotent CLI seed then created **50 DRAFT**
recipes. The Product Owner subsequently explicitly approved publication of all
50 current source hashes. The checked-in manifest is
`docs/recipe-library-approved-v1.json`; the CLI verified source hashes, stored
hashes and recomputed database content hashes before publishing. A follow-up
read-only query verified **50 PUBLISHED, 0 DRAFT**, each with `published_at` and
the expected seed source. No additional remote migration was applied.

## Executed Checks

| Check                                                                                           | Result | Scope                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                | Passed | Restored missing installed dependencies; no dependency/lockfile changes                                                      |
| `pnpm lint`                                                                                     | Passed | All four workspaces                                                                                                          |
| `pnpm typecheck`                                                                                | Passed | API, contracts, mobile and shared UI                                                                                         |
| `pnpm test`                                                                                     | Passed | 240 backend and 398 mobile tests; optional 15 database tests skipped in ordinary run; contracts script remains a placeholder |
| API tests with explicit `RECIPE_TEST_DATABASE_URL`                                              | Passed | All 255 backend tests, including 15 against isolated PostgreSQL 17                                                           |
| `pnpm build`                                                                                    | Passed | NestJS build and Expo exports for iOS, Android and web                                                                       |
| `pnpm --filter @cena/api db:validate`                                                           | Passed | Prisma schema validation                                                                                                     |
| `pnpm --filter @cena/api db:generate`                                                           | Passed | Prisma client generation                                                                                                     |
| `db:migrate:local`, both URLs explicitly local                                                  | Passed | Full migration chain plus follow-up on private loopback PostgreSQL                                                           |
| Prisma migrate diff, explicitly local datasource to schema                                      | Passed | No difference detected                                                                                                       |
| `pnpm --filter @cena/api recipes:validate`                                                      | Passed | 50 original draft recipes, offline validation                                                                                |
| `pnpm --filter @cena/api recipes:seed`                                                          | Passed | Explicitly requested against configured Supabase database: created 50 DRAFT rows; no publication                             |
| `pnpm --filter @cena/api recipes:publish --approval ../../docs/recipe-library-approved-v1.json` | Passed | Product-owner-approved 50 current slugs/hashes; 50 published, 0 skipped                                                      |
| Supabase read-only recipe count                                                                 | Passed | Verified 50 PUBLISHED, 0 DRAFT, 50 published timestamps and 50 rows from `cena-initial-v1`                                   |
| Seed and publication integration tests                                                          | Passed | First seed creates drafts, retry skips 50, hash/ownership/approval guards and idempotent fixture publication                 |
| Large deterministic matching tests                                                              | Passed | 1,000 candidates/batches, request snapshot reuse and cursor batching; not a latency benchmark                                |
| `pnpm --filter @cena/mobile storybook:generate`                                                 | Passed | Story discovery                                                                                                              |
| Storybook Expo web export                                                                       | Passed | `STORYBOOK_ENABLED=true`, output outside repository                                                                          |
| Recipe Storybook rendering tests                                                                | Passed | Preview, availability, result and detail states without live APIs/authentication                                             |
| `git diff --check`                                                                              | Passed | No whitespace errors                                                                                                         |
| `pnpm format:check`                                                                             | Failed | Repository-wide pre-existing formatting deviations remain; touched/new files checked separately                              |

The initial targeted runs were blocked by missing installed OCR dependencies.
After the frozen-lockfile install, full mobile lint/typecheck/tests and exports
passed. A first migration-diff attempt using a migrations directory could not run
without a shadow database; the final comparison used the isolated local database
and succeeded instead.

## Review

An independent review following `cena-pr-review` identified five medium issues:
ingredient-form/count ambiguity, an absent unquantified-ingredient database check,
misleading search text and repeated whole-inventory preparation. All were fixed
and re-reviewed with no remaining critical/high/medium code findings.

The implementation used feature/backend/UI/testing/review project skills through
direct file reads and delegated agents. The test skill's actual path is
`.opencode/skills/cena-testning/SKILL.md`. No AI integration skill or runtime model
integration was needed. Agent execution used the platform-provided `general` and
`explore` agents; their underlying model IDs were not exposed.

## Not Verified Or Approved

- Publication has explicit Product Owner approval. Recipes have not been
  physically test-cooked; publication is not a claim of physical testing.
- No API/mobile deployment or PR merge.
- No physical iOS/Android walkthrough, screen-reader/dynamic-type verification or
  visual Storybook inspection. Automated rendering/bundling is not a substitute.
- No live multi-account mobile-to-API journey; household isolation is covered by
  service, HTTP integration and isolated PostgreSQL tests.
- No measured production-load latency, nutrition or allergy-safety validation.
- The migration incident above requires explicit product-owner review.
