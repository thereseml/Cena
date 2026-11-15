# Shopping list

The private-beta shopping list is shared by every authorized member of a household. PostgreSQL is the source of truth; the mobile screen reloads when focused and after writes. Realtime synchronization is not part of this flow.

## Data model

- One `ShoppingList` belongs to each household (`household_id` is unique).
- `ShoppingListItem` stores a name, optional positive quantity and inventory unit, purchase state, optimistic-concurrency version, timestamps, and optional recipe/source references.
- A successful inventory transfer marks the item as transferred and links the created inventory item. Transferred rows are excluded from the active list, preserving the one-time transfer record.
- Partial unique index prevents two active unchecked rows with the same normalized name. Adding an existing active name returns a conflict with a Swedish message; users can edit the existing row. Purchased rows remain accessible and a later purchase can be recorded as a new row.
- Shopping tables have row-level security enabled without direct client policies. NestJS verifies household membership for every operation.

## API

All routes are under `/api/v1/households/:householdId/shopping-list` and require the existing Supabase JWT guard plus verified household membership.

| Method   | Path                       | Behavior                                                                        |
| -------- | -------------------------- | ------------------------------------------------------------------------------- |
| `GET`    | `/`                        | Active household list; transferred rows omitted                                 |
| `POST`   | `/items`                   | Add a manual item; quantity and unit are both optional                          |
| `PATCH`  | `/items/:itemId`           | Edit name/quantity/unit with `expectedVersion`                                  |
| `PATCH`  | `/items/:itemId/purchased` | Check or uncheck with `expectedVersion`; does not touch inventory               |
| `DELETE` | `/items/:itemId`           | Remove an active row with `expectedVersion`                                     |
| `POST`   | `/items/batch`             | Add reviewed recipe rows (`recipeId` and selected `recipeIngredientId` entries) |
| `POST`   | `/clear-completed`         | Delete the explicitly selected purchased active row IDs                         |
| `POST`   | `/import-to-inventory`     | Confirm and transfer selected purchased rows                                    |

Inputs are validated server-side. Mutations are scoped to the authorized list and use version checks where concurrent edits could overwrite data. A duplicate active name or stale version returns a conflict rather than a raw database error.

## Recipes

The recipe review screen uses the recipe detail's household match. `PARTIAL` and `MISSING` rows may suggest `missingQuantity`; known volume measures (`dl`, `msk`, `tsk`) are converted to ml. Unknown availability has no suggested amount and is not preselected. The user can review names and amounts before a single batch request. The backend re-fetches the published recipe with household matching, verifies source ingredient IDs and rejects ingredients that are currently available.

Duplicate names already on the active list are not silently merged: the batch is rejected with a conflict so the user can review the existing row. Unit synonyms and product identity are not inferred. Portion scaling is not implemented.

## Inventory transfer

Checking a row only changes its shopping state. The separate review screen requires a selected purchased row, product name, positive quantity, inventory unit, and storage location. Expiry metadata stays empty unless a future explicit review flow collects it.

After explicit confirmation, the API transaction conditionally claims every selected row, creates inventory item/batch/`PURCHASED` event through `InventoryService`, and links the item to the transfer record. All selected rows transfer atomically: if one row is stale or any inventory write fails, the transaction rolls back and shopping data remains available. A stable per-shopping-row inventory request ID and transferred marker prevent a second import, including requests from another household member. Existing stock is not overwritten or merged.

## Verification

Run from the repository root:

```bash
pnpm --filter @cena/api db:validate
pnpm --filter @cena/api typecheck
pnpm --filter @cena/api lint
pnpm --filter @cena/api test --runTestsByPath test/shopping.service.spec.ts
pnpm --filter @cena/mobile typecheck
pnpm --filter @cena/mobile lint
pnpm --filter @cena/mobile test --runTestsByPath __tests__/shopping.test.ts __tests__/product-components.test.tsx
```

Migration application and real concurrent-transaction behavior require an isolated local PostgreSQL database. The unit tests use deterministic Prisma mocks and do not establish live database concurrency behavior.

## Limitations

- No realtime updates; another member's changes appear on focus/retry or after this device's own mutation.
- Same-name active unchecked items are rejected rather than automatically combined.
- Recipe portions are not scaled. Unknown or incompatible recipe quantities are not guessed.
- Transfer is all-or-nothing for the selected batch, not partially successful.
- Expiry dates and storage-location suggestions are not inferred.
