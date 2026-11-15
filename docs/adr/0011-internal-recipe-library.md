# ADR-0011: Internal Recipe Library And Inventory Matching

- Status: Accepted by explicit product-owner instruction for the recipe-library task, 2026-11-15
- Supersedes: ADR-0005 for recipe discovery/generation only; MVP decision D03
- Does not change: the historical blueprint or unrelated future AI decisions

## Context

The product owner replaced runtime AI generation and proposed external recipe
search with a shared internal library. No recipe provider, runtime model request,
image import, CMS or paid service is authorized by this task.

## Decision

Store global recipes and ordered, quantified ingredient rows in PostgreSQL through
Prisma. NestJS owns published-only reads, bounded pagination, filtering and
deterministic household inventory matching. Authenticate all API requests and
verify membership before reading household inventory. Never mutate inventory
when browsing, opening or recommending recipes.

Use the existing Ingredient entity and a small exact alias table, not a new food
ontology or fuzzy inference. Preserve existing Ingredient, Product, InventoryItem,
ProductBatch and InventoryEvent identities and histories. Explicitly distinguish
forms such as cooked legumes, lasagne plates, garlic cloves and bread slices.

Use compatible quantity dimensions only: mass, volume and count. Swedish recipe
volume measures are exact multiples of milliliters; no density, package-size or
piece-to-weight conversions are inferred. Repeated ingredient rows consume a
shared in-memory balance per recipe. Alternatives do not reserve stock.

Use Europe/Stockholm calendar days. Past use-by stock is excluded. Past best-before
stock needs assessment and is uncertain, not automatically available. No expiry
date is not by itself evidence of an unknown quantity. Matching never guarantees
food or allergy safety.

Seed 50 original Swedish recipes as drafts. A separate explicit operator command
publishes only a human-approved slug/hash manifest after checking source and
actual stored content. Household owners are not global editors. There is no
public write/publication endpoint and no startup/deploy auto-seeding.

## Consequences

- No runtime AI/external recipe dependency, cost or nondeterministic recipe output.
- Editorial review, not automated validation, approves recipe quality. Initial
  recipes are not physically test-cooked or approved merely by this ADR.
- Seed updates drafts safely, never deletes unrelated recipes or overwrites
  changed published content. Reseeding is not publication.
- Recommendations use inventory only. Preference/allergy enforcement, favorites,
  cooking confirmation, shopping integration and planning are not implemented by
  this PR; existing independent beta requirements remain separate work.
- Exact matching deliberately misses unrecognized brands/abbreviations rather
  than manufacturing sufficient quantities.
- Compact candidates are scanned in batches for ranking, and only the requested
  page is returned. Prepared ingredient-indexed inventory is reused per request.
  See [recipe documentation](../recipes.md) for complexity and limitations.

## Verification

Test publication visibility, seed idempotency and hash guards, authorization,
normalization, quantity dimensions, repeated rows, expired stock, deterministic
ranking, filters/pagination, mobile error/navigation states and isolated real
PostgreSQL constraints. Human recipe approval and device checks remain distinct
from automated tests.
