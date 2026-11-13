# Household inventory

The first manual inventory flow uses PostgreSQL as its source of truth. Mobile requests are authenticated with the Supabase access token and all routes are scoped to a household. The API resolves the application user and verifies the `(householdId, userId)` membership before reading or mutating inventory. Unknown and non-member households return the same not-found response.

## Domain and persistence

- `Ingredient` is the normalized food identity; `Product` is the normalized product identity used by inventory. The household-specific display name is stored on `InventoryItem` so one household cannot rename a catalog entry shown to others.
- `InventoryItem` belongs to one household and stores its display name, unit, storage location, archive timestamp, create idempotency key and optimistic-concurrency version.
- `ProductBatch` is the source of quantity and stores optional date-only expiry metadata. A manual inventory entry currently creates one batch; the API returns the item quantity as the sum of its batches.
- `InventoryEvent` is append-only audit history with a unit for every delta. Manual creation records a positive `ADDED` delta, edits record an `ADJUSTED` delta (zero for metadata-only edits), and archive records a negative `REMOVED` delta. `PURCHASED` is reserved for a future verified restock flow. Changing units records a negative delta in the old unit and a positive delta in the new unit. `REMOVED` does not mean food was discarded; `DISCARDED` and `CONSUMED` are reserved for explicit/future workflows.

Current active quantity is the sum of batches on non-archived inventory items; there is no duplicate quantity column on `InventoryItem`. Event deltas are not replayed to derive a balance. This keeps an archived row out of active totals while retaining its batches and events, without counting the removal event twice. Item, batch and event changes are committed in a single Prisma transaction. Inventory mutations increment `version`; edits and removals send the version they read and return `409 Conflict` rather than overwriting a concurrent household change.

Expiry date uses PostgreSQL `DATE` and the API wire format `YYYY-MM-DD`. Date, type and source must either all be present or all be null. The types are `BEST_BEFORE` and `USE_BY`; sources are `USER_ENTERED` and `ESTIMATED`. Manually entered dates use `USER_ENTERED`. The mobile overview uses a temporary three-calendar-day “use soon” threshold; an expired best-before date is not presented as a food-safety verdict.

The migration enables RLS on every new `public` table without granting direct mobile access. The NestJS API uses the server database role, which bypasses RLS, so the API membership check remains the authorization boundary. Never connect the mobile client directly to these tables.

## API

Base URL includes `/api/v1`. All endpoints require a valid Supabase bearer token.

| Method   | Path                                         | Behavior                                                                   |
| -------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| `GET`    | `/households/:householdId/inventory`         | List active items                                                          |
| `POST`   | `/households/:householdId/inventory`         | Create item, batch and `ADDED` event; requires an `Idempotency-Key` header |
| `GET`    | `/households/:householdId/inventory/:itemId` | Read active household item                                                 |
| `PATCH`  | `/households/:householdId/inventory/:itemId` | Replace editable fields; requires `expectedVersion`                        |
| `DELETE` | `/households/:householdId/inventory/:itemId` | Archive and record `REMOVED`; requires `expectedVersion`                   |

Units are `st`, `g`, `kg`, `ml` and `l`. Storage values are `FRIDGE`, `FREEZER` and `PANTRY`. Quantities must be positive and use at most three decimal places. The API accepts `USER_ENTERED` expiry source for these manual routes; `ESTIMATED` remains available to future trusted recognition flows. The database checks positive batch quantities and complete-or-null expiry metadata.

## Mobile and local development

The kitchen screen fetches the selected household's inventory whenever it gains focus, so returning from add/edit/delete refreshes data from the API. Search and storage filters operate on that fetched data. The Home inventory summary uses the same endpoint. API errors do not fall back to examples. The recipe and shopping previews remain mock data and are outside this feature.

Use the local development database configured for `apps/api`; never apply this migration to production as part of this PR. With local environment variables configured:

```sh
pnpm --filter @cena/api db:generate
pnpm --filter @cena/api exec prisma migrate dev
pnpm --filter @cena/api db:validate
pnpm --filter @cena/api test
pnpm --filter @cena/mobile test
```

The mobile app selects the first household in the authenticated profile. Household switching is not implemented. A manual inventory entry currently has one batch; the schema supports more, but editing an item with multiple batches is rejected rather than silently collapsing batch information. No offline write queue is provided.
