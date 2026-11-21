# Internal Recipe Library

## Scope And Architecture

[ADR-0011](adr/0011-internal-recipe-library.md) replaces runtime AI/external recipe
search with a global PostgreSQL library. There are no external recipe calls or
runtime recipe generation. Recipes have no household owner. Inventory remains
private and every matching request verifies household membership in NestJS.

- Schema/migrations: `apps/api/prisma/`.
- API and matching: `apps/api/src/recipes/`.
- Original content and operator commands: `apps/api/src/recipes/library/`.
- Wire types: `packages/contracts/src/recipes.ts`.
- Mobile composition, hooks and response parsers: `apps/mobile/features/recipes/`.

`Recipe` has a UUID, unique stable slug, Swedish title/description, meal category,
preparation/cooking/total minutes, portions, ordered instruction array, tags,
publication status, timestamps, seed source and SHA-256 content hash.
`RecipeIngredient` has a canonical Ingredient foreign key, recipe-owned display
name, optional Decimal(12,3) quantity, validated unit, preparation notes and unique
position within its recipe. Null quantity is explicitly `efter smak`, not a zero
or an invented quantity. `IngredientAlias` maps one exact normalized spelling to
one canonical ingredient. Foreign keys and checks enforce integrity; RLS is
enabled without mobile Data API policies, matching existing backend-only access.

## Seed And Editorial Workflow

See [the review guide](recipe-review.md) for the complete procedure and manifest
format. From the repository root:

```sh
pnpm --filter @cena/api db:generate
pnpm --filter @cena/api build
pnpm --filter @cena/api recipes:validate
pnpm --filter @cena/api recipes:review
```

Validation and the readable Markdown review need no database or credentials.
The review output includes every recipe, quantity, step, alias and approval hash.
The initial 50 recipes are original drafts, not copied from websites or physically
test-cooked. They were subsequently explicitly approved for publication by the
Product Owner; the approved hash manifest is
[`recipe-library-approved-v1.json`](recipe-library-approved-v1.json). No recipe
images are imported.

After selecting a database with all migrations applied, explicitly run
`recipes:seed`. Seed uses stable slugs and `cena-initial-v1` ownership, skips
identical content, atomically updates changed drafts, rejects changed published
content or foreign-owned slug collisions, and never deletes unrelated recipes.
It does not modify inventory or replace existing product/ingredient mappings.

For a new recipe, add typed data in the appropriate library file, register it in
`library/index.ts`, and add any necessary explicit canonical ingredient/aliases.
Validate, build, review, seed as draft, then obtain human approval. Never reuse a
slug for a different dish. There is no fixed 50-recipe limit; the count test for
the initial collection should be updated deliberately when adding content.

Only after editorial approval run:

```sh
pnpm --filter @cena/api recipes:publish --approval /absolute/path/approved-recipes.json
```

The nonempty manifest lists exact approved slugs and hashes. The initial 50-recipe
Product Owner approval is recorded in `docs/recipe-library-approved-v1.json`.
Source hash, stored
hash and hash recomputed from stored recipe content must all agree. Repeating the
same approval does not change publication dates. Database access for this command
is an operator capability, not a household membership privilege. Approval files
must be maintained as explicit editorial records and never generated as approval
by the CLI. Local publication tests are fixtures, not approval
to publish recipes in another environment. To revise a published recipe, an
authorized operator must deliberately unpublish it before reseeding and obtaining
new approval; this PR provides no public administration API.

## API Contracts

All routes require a valid Supabase JWT and use the existing `/api/v1` prefix.

| Route                          | Result                                      |
| ------------------------------ | ------------------------------------------- |
| `GET /recipes`                 | `RecipePage`, published summaries only      |
| `GET /recipes/recommendations` | Ranked `RecipePage`; `householdId` required |
| `GET /recipes/:id`             | `RecipeDetail`; UUID, published only        |

List/recommendation filters: `search` (case-insensitive title substring, max 100
characters), `mealCategory` (`DINNER`, `LUNCH`, `BREAKFAST`, `SNACK`),
`maxTotalMinutes` (1–1440), `page` (1–10000, default 1), `pageSize` (1–50, default
20), optional `householdId` (UUID). Time includes preparation plus cooking.
Unknown/invalid query fields are rejected with 400. Without household context,
availability is null; with it, membership is checked before inventory is queried.
An inaccessible household or unpublished/missing recipe returns 404. The mobile
app uses its current first household for all recipe requests and validates JSON
before rendering it.

`RecipePage` contains `items`, `page`, `pageSize`, `total`. Summaries include
metadata, tags and availability counts, not instructions or household identifiers.
Details add ordered ingredients and instructions. Ingredient results include
`availability`, `reason`, `availableQuantity` and `missingQuantity`, all in the
recipe row's unit. For unknown stock, `missingQuantity` is null rather than a
fabricated confirmed shortage. Reading never creates inventory events.

## Matching And Ranking

Normalize exact names using NFC, Swedish lowercase, trim and whitespace collapse.
Resolve legacy product ingredient names through curated aliases at read time;
do not merge history, strip arbitrary brands/sizes or perform fuzzy matching.
Receipt abbreviations must be explicit aliases. `Mjölk 1L` with `2 st` does not
prove two liters exist; even a recognized milk name with `st` cannot satisfy a
volume requirement. Dry/cooked legumes, whole garlic/cloves, bread/slices and
generic pasta/lasagne plates are not silently interchangeable.

Prepare one stock snapshot indexed by ingredient. Use Decimal arithmetic,
converting kg/g and l/dl/ml/msk/tsk (1 msk = 15 ml; 1 tsk = 5 ml). Never convert
between mass, volume and count. Allocate compatible stock in expiry-date/ID order
using fresh balances for each recipe. Repeated rows share those balances and
cannot double count the same stock. No reservation or persisted deduction occurs.

| State       | Meaning                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------- |
| `AVAILABLE` | Known compatible stock meets the full quantity                                            |
| `PARTIAL`   | A known compatible quantity exists but is insufficient                                    |
| `MISSING`   | No usable matching stock; past use-by is not usable                                       |
| `UNKNOWN`   | Quantity is unquantified, units cannot be compared, or best-before stock needs assessment |

Compatible partial stock plus uncertain additional stock is `UNKNOWN` with its
known available amount preserved, not a definite shortage. Past dates are never
counted automatically: use-by excludes the batch; best-before requires assessment.
Estimated dates do not become verified package dates. Undated stock is not
automatically excluded. This is a conservative stock estimate, not a food-safety
or allergy guarantee.

Category/time/search are hard filters. Recommendations rank by fully covered
ingredient fraction, fewer missing rows, fewer unknown rows, more partial rows,
then whether a positively allocated, user-entered batch date falls from today
through three days ahead, shorter total time and stable UUID. Date urgency is
therefore only a tie-breaker after inventory suitability; estimated dates, passed
dates and unallocated stock never provide a boost. Past use-by batches are
excluded, and past best-before batches require assessment and are not treated as
available. The API exposes `usesExpiringIngredients` from the same actual matching
allocation; the mobile card only shows its explanation when that flag is true.
Quantities of different dimensions are not added together and no percentage is
displayed to users. Standard browsing uses stable database title/UUID ordering.

## Scaling And Limitations

Normal browsing filters and paginates in PostgreSQL. Recommendations scan compact
candidate metadata/ingredients in batches of 100 and retain the requested top
window, never load full instructions for every candidate or return the whole
library. Ingredient-indexed stock and conversions are prepared once per request;
each recipe clones only relevant balances. This supports hundreds/thousands of
recipes without a new service. Ranking is still linear in filtered candidate
count, and title substring search is not a full-text search engine. Measure before
adding trigram indexes, precomputed matching or a larger-catalog search design.

- No aliases inferred from arbitrary receipt text; false negatives are intentional.
- No package size, density, drained-weight or piece/weight inference.
- No serving adjustment UI, substitutions, nutrition, allergy-profile enforcement,
  favorites, shopping writes or cooking/deduction actions in this PR.
- Availability is a request-time snapshot, not a reservation or guarantee after
  another household member edits stock.
- The ordinary database role can bypass RLS, so server-side authorization is
  mandatory. There are no public write/publication routes.
- Until human approval, the recipe list is honestly empty rather than showing
  unreviewed drafts or fake inventory percentages.

## Local Verification

Never use the normal application database for integration tests. The opt-in
PostgreSQL suite only accepts loopback port 55439 and database `cena_recipes_test`.
Start an isolated database (credentials below are disposable local fixtures):

```sh
docker run --detach --name cena-recipes-test --env POSTGRES_PASSWORD=cena_local_test --env POSTGRES_DB=cena_recipes_test --publish 127.0.0.1:55439:5432 postgres:17-alpine
DATABASE_URL=postgresql://postgres:cena_local_test@127.0.0.1:55439/cena_recipes_test DIRECT_DATABASE_URL=postgresql://postgres:cena_local_test@127.0.0.1:55439/cena_recipes_test pnpm --filter @cena/api db:migrate:local
RECIPE_TEST_DATABASE_URL=postgresql://postgres:cena_local_test@127.0.0.1:55439/cena_recipes_test pnpm --filter @cena/api test --testPathPattern=recipes.postgres
```

Prisma prioritizes `DIRECT_DATABASE_URL`. Set **both** URLs explicitly;
`db:migrate:local` refuses a non-loopback selected target before Prisma connects.
Do not use ordinary `prisma migrate deploy` assuming `DATABASE_URL` overrides an
existing direct URL. Migration validation/generation does not itself prove that
SQL or seed execution succeeds. Keep local test publication and editorial
production approval separate. Full Storybook/device visual checks and live
two-account navigation remain distinct from Jest and Expo export success.
