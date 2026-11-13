# ADR-0007: Authentication and household foundation

**Status:** Accepted for private beta foundation (product-owner implementation request, 2026-11-12)

## Context

The private beta foundation needs a passwordless sign-in, verified API identity and safe automatic first-household provisioning. ADRs 0002–0004 intentionally deferred exact API/auth integration and database transaction details.

## Decision

- Use Supabase Auth email OTP with a numeric code delivered using the configured Supabase email template. The client uses `signInWithOtp` and `verifyOtp`; no Cena password or OTP storage is added.
- Persist the React Native Supabase session through Expo SecureStore and coordinate token auto-refresh with app foreground/background state.
- Verify Supabase access tokens in NestJS with `jose` and the project's asymmetric JWKS endpoint. Require the configured issuer, `authenticated` audience, signature, unexpired token and `authenticated` role; reject service-role tokens. Legacy symmetric JWT signing is not accepted by this verifier.
- Use a runtime PostgreSQL session-pooler URL for the long-lived API and a direct database URL for Prisma migrations. On IPv4-only networks, use Supavisor session mode (port 5432) for migrations too. Local PostgreSQL may use one URL for both.
- Provision the application user and initial household in one Prisma transaction. A persistent `provisioningCompleted` state guarded by a conditional update ensures one concurrent request performs initial provisioning and prevents bootstrap from recreating a household after later membership removal.
- Scope all household reads by a verified membership; return not-found for unknown and non-member household IDs. Client input cannot set membership roles.
- Enable RLS on the `public` application tables and Prisma migration history with no direct-client policies. The mobile app has no direct database access; NestJS remains responsible for membership authorization. The server connects as the database owner, which bypasses RLS; this is defense in depth, not a replacement for server authorization.

## Consequences

- Supabase email template and asymmetric JWT signing configuration are required for a complete end-to-end flow.
- Existing memberships remain valid when provisioning is retried; users with a completed initial provisioning and no memberships are not silently re-enrolled.
- Invitations, membership mutation, household switching UX, RLS and hosted migration operations remain outside this decision and this PR.

## References

- [Private beta scope](../mvp-scope.md)
- [Authentication and household setup](../auth-household-foundation.md)
- [ADR-0002: Backend service boundary](0002-backend-and-api.md)
- [ADR-0003: Database and ORM](0003-database-and-orm.md)
- [ADR-0004: Authentication provider](0004-authentication.md)
