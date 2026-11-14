# Cena architecture decisions

Architecture Decision Records (ADRs) capture **approved technical choices** independently of the preserved historical blueprint. Read [MVP scope](../mvp-scope.md) first for product priorities. These accepted ADRs supersede conflicting **proposed technical defaults** in [blueprint.md](../blueprint.md); do not rewrite that file.

| ADR                                           | Decision                                                                       | Status                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| [0001](0001-mobile-and-monorepo.md)           | Expo / React Native / TypeScript; pnpm + Turborepo                             | Accepted                                  |
| [0002](0002-backend-and-api.md)               | NestJS modular-monolith API                                                    | Accepted                                  |
| [0003](0003-database-and-orm.md)              | Supabase PostgreSQL + Prisma                                                   | Accepted                                  |
| [0004](0004-authentication.md)                | Supabase Auth                                                                  | Accepted                                  |
| [0005](0005-ai-integration.md)                | OpenAI API through NestJS for general/recipe AI integrations                   | Accepted                                  |
| [0006](0006-hosting-deferred.md)              | Hosting explicitly deferred                                                    | Deferred                                  |
| [0007](0007-auth-and-household-foundation.md) | Email OTP, JWKS verification and idempotent household bootstrap                | Accepted                                  |
| [0008](0008-food-recognition-provider.md)     | Cloudflare Workers AI for food photo recognition                               | Superseded by 0009                        |
| [0009](0009-receipt-import-ocr.md)            | Receipt-only scope and deterministic Swedish parsing; historical ML Kit engine | Accepted scope; engine superseded by 0010 |
| [0010](0010-expo-go-receipt-ocr.md)           | Bundled Tesseract.js 7 in an Expo Go WebView                                   | Accepted                                  |

## Implementation gates not yet approved

The decisions above establish technology boundaries, **not** an executable deployment or complete security design. Before implementing affected features, document the following as follow-up ADRs or approved technical specifications:

1. **Authorization and household lifecycle:** membership validation for every request; invitation link/email acceptance, expiry, revocation, roles and household deletion; cross-household isolation tests.
2. **Database access and transactions:** migration ownership, Prisma connection pooling compatible with the selected Supabase connection method, tenant-scoped queries, idempotency and concurrent inventory updates.
3. **Auth integration:** token verification/JWKS, session refresh, signup/invite flow, server trust boundary and Row Level Security policy (defense in depth if used).
4. **AI contracts:** validated recipe schemas, timeouts, rate limits, cost caps, safety/uncertainty UX and evaluation fixtures. Receipt import instead follows ADR-0009's scope and ADR-0010's Expo Go engine: local OCR, no raw image/text upload, deterministic parsing and explicit confirmation; physical-device and Android verification remain release gates.
5. **Operations:** API hosting, environments, secret management, deployment, backup/restore, observability and beta distribution before external beta.
6. **API contracts:** typed REST client, error format, API versioning and concurrency semantics before frontend/backend parallel implementation.

These are **open decisions**, not permission for agents to choose irreversible defaults silently. Block affected implementation until approved; independent scaffolding and tests may proceed. Prefer the smallest secure option consistent with [MVP scope](../mvp-scope.md).

## Decision process

- Accepted: explicitly approved by product owner; implement within stated boundaries.
- Deferred: not selected; do not treat examples as decisions.
- Proposed: requires approval before implementation where material.
- Record supersession by a new ADR referencing the old one; preserve history.
