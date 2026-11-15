# Household invitations and membership

## Lifecycle

Profile bootstrap creates the application user but does not create a household. A user with no membership chooses to create a household or opens an invitation. Creating a household grants `OWNER`; accepting an invitation grants `MEMBER`. A user may have only one household membership. A conflict never moves or deletes existing household data.

Owners can list members and pending invitations, create shareable links and revoke pending links. Members can list members and leave. Owners cannot leave in this beta because ownership transfer is not supported. Leaving removes only the membership; inventory, inventory history and shopping data remain attached to the household.

## Invitation security

The API generates a 32-byte cryptographically random bearer token. Only its SHA-256 hash is persisted. The raw token is returned once with the created link and must not be logged, sent to analytics, or included in error reporting. Links expire after seven days, can be revoked, and can be accepted once. Owners are limited to five new invitations per hour. Preview and acceptance require an authenticated Cena account; a link alone grants no household access.

Acceptance locks both the invitation and application-user rows in one database transaction. It checks current membership, writes the member role and accepted metadata atomically. The unique `household_members.user_id` index protects the one-household beta rule. Migration creation intentionally fails if existing data contains multiple memberships for a user; inspect and resolve that data with the Product Owner rather than deleting or moving it automatically.

## API

All routes are authenticated under the existing `/api/v1` API base:

| Method and route                                   | Permission                                               |
| -------------------------------------------------- | -------------------------------------------------------- |
| `POST /households`                                 | Authenticated user without membership                    |
| `GET /households/:id/members`                      | Household member                                         |
| `GET /households/:id/invitations`                  | Household owner                                          |
| `POST /households/:id/invitations`                 | Household owner                                          |
| `DELETE /households/:id/invitations/:invitationId` | Household owner                                          |
| `POST /household-invitations/preview`              | Authenticated; token in JSON body                        |
| `POST /household-invitations/accept`               | Authenticated; explicit confirmation, token in JSON body |
| `POST /households/:id/leave`                       | Household member (owners are rejected)                   |

Member responses contain a privacy-safe generated display label and role, not email addresses. Invitation listing never returns the token or its hash. Invalid and malformed previews disclose no household metadata.

## Links and local setup

Without `INVITATION_BASE_URL`, the API returns a development link using `cena://invite?token=...`. For a beta HTTPS link, configure the API environment variable `INVITATION_BASE_URL` to an approved HTTPS invitation URL, for example `https://<approved-host>/invite`; the API adds the `token` query parameter. Do not put this value in source control.

An email-sending domain is not automatically configured for app links. iOS Universal Links additionally need a hosted Apple App Site Association file and the app's associated-domain entitlement. Android App Links need a hosted `assetlinks.json`, the application package and signing-certificate fingerprint, and a verified intent filter. The current repository does not yet have the approved hostname, hosting, these association files, or a web fallback. Until those are supplied and installed builds are verified, HTTPS opening from other apps is not guaranteed; the custom scheme is for development only.

The mobile app temporarily keeps an invitation token in Expo SecureStore across authentication and restart. It sends the token only in authenticated API request bodies, asks for explicit acceptance, and clears it after acceptance or cancellation. The token must never be logged or tracked.

## Verification

Run the API and mobile tests plus Prisma validation/client generation. A database migration must only be verified against an isolated local database using the `db:migrate:local` workflow in [development-workflow.md](development-workflow.md), with both database URLs explicitly pointing to that local database. The API and mobile unit tests do not prove concurrent PostgreSQL behavior or a two-device user journey. HTTPS Universal/App Links require a configured domain and signed platform builds.
