# ADR-0003: Database and ORM

**Status:** Accepted (product-owner architecture decision, 2026-11-08)

## Context
The original blueprint selected PostgreSQL/Supabase but left ORM unspecified. Shared inventory needs consistent writes and auditability.

## Decision
- Use **PostgreSQL hosted by Supabase**.
- Use **Prisma ORM** from the NestJS backend for application data access and versioned schema migrations.
- PostgreSQL is the authoritative store for household, inventory, recipe and shopping data.

## Consequences and guardrails
- Require household-scoped authorization and transaction-safe inventory adjustments.
- Do not permit negative inventory or duplicate confirmed changes.
- Prefer transactional inventory events and idempotent mutation APIs.
- Do not assume Supabase RLS automatically protects Prisma's direct server connections; enforce server authorization and separately design any RLS defense in depth.

## Deferred implementation details
Connection pooling, migration deployment, schema ownership, RLS policy, concurrency strategy and backup/restore.

## References
- [Private beta scope](../mvp-scope.md)
- [Historical architecture](../architecture.md)
- [Original blueprint](../blueprint.md)
