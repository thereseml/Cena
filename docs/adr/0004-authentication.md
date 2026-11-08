# ADR-0004: Authentication provider

**Status:** Accepted (product-owner architecture decision, 2026-11-08)

## Context
Cena needs account recovery and shared-household invitations. Authentication and household authorization are separate concerns.

## Decision
- Use **Supabase Auth** for identity and sessions.
- NestJS must verify authenticated identity before any protected operation and authorize membership for household-owned resources.
- Do not implement a second password store in NestJS.

## Consequences and guardrails
- Supabase Auth identity is not proof of membership in a given household.
- Never expose service-role keys in the mobile app.
- Invitation acceptance must be validated server-side; pending links grant no household access.

## Deferred implementation details
Login methods beyond email/password, token verification and refresh implementation, invitation transport, membership roles and account deletion flow.

## References
- [Private beta scope](../mvp-scope.md)
- [Historical architecture](../architecture.md)
- [Original blueprint](../blueprint.md)
