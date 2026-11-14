---
name: cena-backend
description: Develop Cena NestJS APIs, Prisma models, PostgreSQL migrations, shared contracts and household-scoped business logic. Use for backend features, database changes, authorization and API refactoring.
---

# Cena Backend Development

## Purpose

Build secure, maintainable backend functionality using Cena's approved architecture.

## Required context

Read:

- `AGENTS.md`.
- `docs/blueprint.md`.
- Relevant accepted ADRs.
- Existing NestJS modules.
- Existing Prisma schema and migrations.
- `packages/contracts`.
- Relevant tests.

Do not assume proposed infrastructure is already configured.

## Architecture

Follow Cena's modular monolith architecture.

Use:

- NestJS controllers for HTTP handling.
- Services for business logic.
- Prisma for database access.
- Shared contracts where appropriate.
- Validation at system boundaries.

Keep controllers thin.

Do not introduce microservices or new infrastructure without approval.

## Implementation workflow

1. Inspect existing modules and patterns.
2. Identify the owning domain.
3. Define request and response contracts.
4. Review database implications.
5. Define authorization requirements.
6. Implement business logic.
7. Implement HTTP endpoints.
8. Add tests.
9. Verify migrations and integration.
10. Document meaningful changes.

Prefer extending existing modules over creating duplicate services.

## Database rules

Follow approved domain distinctions:

- Ingredient.
- Product.
- InventoryItem.
- ProductBatch.
- InventoryEvent.

Preserve batch-level expiry tracking and inventory history.

Requirements:

- Version-controlled migrations.
- Appropriate foreign keys.
- Appropriate indexes.
- Server-side validation.
- Transactional related writes.
- Safe concurrency behavior where relevant.

Never rewrite applied migrations.

Never perform destructive production database operations without approval.

## Household authorization

Every household-owned resource must be scoped to an authorized household.

For each protected operation:

1. Verify authentication.
2. Identify the authenticated user.
3. Verify household membership and required permissions.
4. Scope the database operation to the authorized household.
5. Reject unauthorized access.

Never trust client-supplied household IDs without authorization.

Test cross-household access.

## API contracts

Use consistent:

- Validation.
- Error handling.
- HTTP status codes.
- Request and response shapes.
- Naming conventions.

Reuse `packages/contracts` when appropriate.

Do not expose internal database fields unnecessarily.

## Inventory integrity

Inventory operations must preserve consistency between relevant:

- Inventory entries.
- Batches.
- Quantities.
- Events.
- Household ownership.

Distinguish removal from disposal and consumption.

Follow existing approved event semantics.

Do not silently invent expiry dates.

## Security

- Never expose secrets.
- Never log access tokens.
- Validate untrusted input.
- Apply least privilege.
- Avoid unsafe database queries.
- Handle failures safely.
- Preserve privacy requirements.

## Testing

Cover relevant:

- Successful operations.
- Validation errors.
- Unauthorized requests.
- Cross-household access.
- Transaction failures.
- Concurrency issues.
- Data integrity.
- API response contracts.

Use isolated test databases where required.

Do not run destructive tests against production.

## Final report

Summarize:

1. Modules and endpoints changed.
2. Database changes.
3. Authorization behavior.
4. Contracts changed.
5. Tests executed.
6. Migration requirements.
7. Risks and limitations.

**Principle: Correctness, authorization and data integrity come before implementation speed.**