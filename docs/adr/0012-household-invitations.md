# ADR-0012: Secure household invitation links

**Status:** Accepted for private beta implementation (Product Owner request, 2026-11-15)

## Context

The approved MVP requires household sharing and invitation acceptance (MVP journey J01). The household foundation currently provisions a private owner household during profile bootstrap, which prevents a new invitee from joining without an unsafe implicit household transition. Hosting and the invitation hostname are not configured in the repository.

## Decision

- Profile bootstrap provisions the application identity only. A user without a household explicitly creates one or accepts an invitation.
- A user has at most one household membership. Existing membership conflicts block acceptance; no membership or household data is moved or deleted automatically.
- `OWNER` can create/revoke invitation links and view members/invitation metadata. `MEMBER` can view members and leave. Ownership transfer, member removal and household deletion are not included. An owner cannot leave in this version.
- Invitation tokens contain 32 cryptographically random bytes, are stored only as SHA-256 hashes, expire after seven days, are single-use and revocable. Only authenticated users can preview or accept; acceptance is always explicit.
- Acceptance locks invitation and user records and commits membership plus accepted metadata in one PostgreSQL transaction. A unique user membership index enforces the one-household rule.
- Expo SecureStore preserves a pending invitation through the existing email OTP flow. The mobile app uses native sharing and a configurable HTTPS base URL. The development fallback is the existing `cena` custom scheme.
- No AI or email-delivery integration is added.

## Consequences

- First-time users without an invitation need a household-creation step.
- Existing users and household data are not automatically changed. A user already in another household must remain there or use a separately approved transition; this feature does not provide switching.
- The migration must not proceed if existing memberships violate the new unique-user constraint; investigate instead of deleting or moving data.
- Production HTTPS opening requires the Product Owner to provide the temporary hostname and hosting access for AASA and `assetlinks.json`, plus signed iOS and Android builds. These are not asserted as complete by this decision.
- Owners cannot leave, and role changes/ownership transfer are deferred.

## References

- [Private beta scope](../mvp-scope.md), J01.
- [Household invitation implementation and operations](../household-invitations.md).
- [ADR-0007: Authentication and household foundation](0007-auth-and-household-foundation.md).
