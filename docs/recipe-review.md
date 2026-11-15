# Recipe Library Review

## Status

The `cena-initial-v1` library contains 50 original Swedish recipes written for
Cena, not copied from a recipe publisher. They have not been physically
test-cooked. The Product Owner explicitly approved the current 50 recipe hashes
for publication on 2026-11-15; the approved manifest is
`docs/recipe-library-approved-v1.json`. They are published in the configured
Supabase database. Seeding itself never publishes recipes.

The editorial groups are mutually exclusive: 20 everyday dinners, 10 quick
recipes (at most 25 minutes), 10 vegetarian meals, 5 breakfasts/snacks and
5 soups/lunches. Other groups also contain vegetarian dishes. Group membership
is represented by source files and Swedish tags, not extra database fields.

## Build And Review

Run from `apps/api`, after Prisma client generation. The contracts package is
consumed as source/types and has no separate build step:

```sh
pnpm build
node dist/recipes/library/recipe-library.cli.js validate
node dist/recipes/library/recipe-library.cli.js review
```

`validate` and `review` are offline dry runs: neither reads environment files nor
opens a database connection. `review` prints readable Markdown directly from the
same typed source used by seed, including every field, ingredient, instruction,
canonical key, alias and recipe SHA-256 hash. This command is the authoritative
review artifact; this document deliberately does not duplicate 50 recipes or
contain an implicitly approved manifest. Capture its output using your normal
review tooling when a persistent review artifact is needed.

Review all selected recipes for realistic portions, ingredient amounts and forms
(especially dry vs cooked and drained weights), complete actionable steps,
equipment, timings and safe cooking temperatures. Read product labels for
allergens; dietary tags are not allergy-safety guarantees. Chicken instructions
require at least 72 °C internally; minced meat and pork at least 70 °C; fish
63 °C. Times are estimates: the specified doneness checks take precedence.
Use separate utensils for raw meat, cool leftovers quickly and keep refrigerated.
Check the full current source again whenever a hash changes. Record reviewer,
date, selected hashes and any practical cooking checks in the human review record.

Changes to ingredient identity, recipe display text or other hashed content
invalidate earlier approvals for affected recipes. After any such change, rebuild,
rerun `review`, review the new content and hashes, and create a fresh approved
manifest. Seed only updates drafts; it never rewrites changed published recipes.

## Seed Drafts

Only run against an explicitly selected local/development database with the
current migrations applied. Production deployment or database changes need
separate authorization. The CLI loads `.env` from the current working directory
without overriding existing environment variables; never print credentials.

```sh
node dist/recipes/library/recipe-library.cli.js seed
```

The seed is one serializable transaction. Stable slugs and `seedSource` identify
library ownership. Identical recipes are skipped; changed drafts replace their
ingredient rows atomically. Any changed published recipe or foreign-owned slug
aborts the entire operation. Unrelated recipes are never deleted. Canonical
ingredients are reused by normalized identity even if an existing display name
is uppercase or otherwise different. Existing names and Product ingredient links
are never overwritten. A legacy Ingredient whose normalized name matches a
curated alias can coexist with an alias pointing to the canonical ingredient for
read-time matching. No legacy Ingredient, Product, inventory row or event history
is merged, relinked or deleted. Conflicting existing alias mappings fail instead
of being reassigned. Ingredient and alias creation is idempotent.

Serialization/concurrent uniqueness conflicts abort safely. After resolving the
conflict, rerun the command; there is no silent retry or force-overwrite mode.

## Explicit Publication

After human approval, supply a JSON file containing only the exact approved
selection. The initial library's owner-approved selection is recorded in
`docs/recipe-library-approved-v1.json`. Example format for future approvals
(replace the placeholder with the full hash printed by `review`; this example is
intentionally not executable approval):

```json
[
  {
    "slug": "citronkyckling-med-rotfrukter",
    "contentHash": "<64 lowercase hexadecimal characters from reviewed source>"
  }
]
```

```sh
node dist/recipes/library/recipe-library.cli.js publish --approval /absolute/path/approved-recipes.json
```

An empty manifest, duplicate entries, unknown fields, arbitrary slugs, stale
source hashes, foreign ownership, missing seed rows or changed database content
are rejected. All selected source hashes, stored hashes and hashes recomputed
from actual database fields must match. Publication is one serializable
transaction; repeating an identical approval does not reset publication dates.
No CLI command automatically generates approval or modifies household inventory.
Publishing every recipe is allowed only when an explicit owner-approved manifest
contains all 50 current slugs and hashes, as it does for the initial release.
Hashes bind the ordered recipe content, including
normalized ingredient identity and recipe-owned display text, not mutable
`Ingredient.name`, IDs, timestamps, status or the separate alias catalog.
Published content with a different stored hash fails closed; there is no
automatic hash migration or overwrite.

## Matching Integration

Normalization comes from `src/recipes/recipe-normalization.ts`:
`normalizeIngredientName(name)` trims/collapses whitespace, applies NFC and
Swedish locale lowercase. Match only exact normalized canonical names or curated
aliases. Receipt spellings such as `mellanmj 1,5%`, `cr fraiche`, `kyckl filé`,
`kyck filé`, `kross tom` and `tomat kross` are explicit catalog entries, not fuzzy rules. A product's size
or packaging never provides purchased quantity. Do not strip brands, punctuation,
diacritics or sizes to manufacture matches.

Generic `kikärter`, `kikärtor`, `kikärt`, `vita bönor` and `kidneybönor` do not
establish cooked versus dry form and are not aliases for cooked legumes. Only
explicit cooked-form aliases are included. The seed never removes pre-existing
alias rows; changes to an existing alias catalog require separate review rather
than implicit cleanup or reassignment during seed.

Counted garlic means `Vitlöksklyfta`, displayed in recipes as `Vitlöksklyftor`;
generic `vitlök` does not establish a clove rather than a whole bulb. Counted bread
means `Brödskiva, fullkorn`, displayed as `Skivor fullkornsbröd`, with only explicit
slice aliases (`fullkornsbröd skivor`, `skiva fullkornsbröd`). Generic `fullkornsbröd`
must not imply slices rather than a loaf. Lasagna uses the distinct ingredient
`Lasagneplattor` with alias `lasagneplattor torra`, not generic `Pasta`. These
identity/display corrections change affected recipe hashes and require renewed
review and approval; they do not authorize changes to published database rows.

Quantities are positive numbers with at most three decimal places. A null
quantity is allowed only with the exact note `efter smak`; availability must
always be `UNKNOWN` with reason `UNQUANTIFIED`, never counted as available or
automatically deducted. The initial recipes quantify all ingredients, including
salt and oil. Water for boiling pasta, rice, eggs or potatoes follows cooking
instructions/package directions; water incorporated in a sauce or dough is
explicitly listed. Ingredient ordering is derived from source array order.

## Integration Exports

- `index.ts`: `RECIPE_LIBRARY`, `SeedRecipe`, `SeedIngredient`,
  `INGREDIENT_CATALOG`, `canonicalIngredient`.
- `recipe-review.ts`: `SEED_SOURCE`, `RecipeApproval`, `recipeContentHash`,
  `validateLibrary`, `validateApprovalManifest`, `reviewLibrary`.
- `seed-library.ts`: `seedLibrary(prisma, recipes = RECIPE_LIBRARY)` and
  `publishLibrary(prisma, approvalManifest, recipes = RECIPE_LIBRARY)`.
- `recipe-library.cli.ts`: `runRecipeLibraryCli(args)`, guarded by
  `require.main === module`. Run the compiled JavaScript, not a transitive
  `ts-node` dependency. Package scripts are integrated separately.

The optional recipe argument supports focused tests/seeding a subset. The CLI
always uses the committed full library as its publication allowlist.
