# Authentication and household foundation

This guide covers the local private-beta setup for Supabase email OTP, the NestJS API and the initial household tables. Inventory, invitations, account deletion, RLS policies and production deployment are not part of this implementation.

## Supabase project setup

1. Create or select a Supabase project for local development. Do not use production credentials for local testing.
2. In **Authentication → Providers → Email**, enable email sign-in and confirm that OTP sign-in is enabled.
3. In **Authentication → Email Templates**, edit **Magic Link or OTP** so passwordless sign-in sends a numeric code instead of a confirmation link. On new Free projects, Supabase locks template editing while the built-in SMTP is active; if the dashboard asks you to configure custom SMTP, this step is blocked until a provider is configured. Use a template such as:

   ```text
   Din engångskod till Cena är: {{ .Token }}
   ```

   If email confirmation is enabled for new accounts, also change **Confirm signup** to include `{{ .Token }}` so new users receive a code the app can verify. Do not put `{{ .ConfirmationURL }}` in the code instructions. Email OTP is six digits by default; configure its expiry under **Authentication → Sign In / Providers → Email → Email OTP expiration**. Supabase's default send rate is one email per 60 seconds, which the app's resend cooldown mirrors.

4. In **Project Settings → API Keys**, copy the project URL and publishable key (or legacy anon key) into `apps/mobile/.env` using `apps/mobile/.env.example` as a template. These values are public client configuration only.
5. In **Project Settings → JWT Keys**, activate an asymmetric signing key (ES256 recommended) for this development project. Note the Auth issuer (`https://<project-ref>.supabase.co/auth/v1`) and JWKS endpoint (`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`). The API verifies signatures, issuer, audience `authenticated`, role and token expiry with the public JWKS. The legacy shared-secret signing algorithm is not accepted by this verifier. Do not rotate or revoke keys in a live project without planning for current sessions and dependent services.
6. In **Project Settings → Database → Connect**, obtain PostgreSQL connection strings, not the project HTTP API URL. Set `DATABASE_URL` to the Supavisor **session-mode** pooler URL for the long-lived API process. Set `DIRECT_DATABASE_URL` to the direct database URL for migrations. Direct database hosts are IPv6-only unless the project has IPv4 enabled; from an IPv4-only network, use the Supavisor session-mode URL (port `5432`) for `DIRECT_DATABASE_URL` too. Do not use transaction mode (port `6543`) for migrations. A local PostgreSQL URL may be used for both during isolated development.

### Email delivery for beta testers

Supabase's built-in SMTP is for development only. It only sends to addresses belonging to the Supabase organization and has a very low rate limit (currently two messages per hour). On a new Free project, the default template cannot be changed while using built-in SMTP, so it may not produce the numeric code required by Cena. A custom SMTP provider can be configured in **Authentication → SMTP Settings**; it may have a free tier, but provider selection and any cost need product-owner approval. Do not share SMTP credentials in chat or commit them; enter them in Supabase's dashboard configuration. No provider has been selected or configured for this PR.

For development without a hosted SMTP provider, a local Supabase CLI stack with its local email inbox is an alternative. This repository does not yet have local Supabase stack configuration; that setup would be a separate development task.

Do not use the service-role key in either app. The API uses only a PostgreSQL connection and public JWT verification keys; no Supabase Auth admin API is called.

## Environment variables

`apps/mobile/.env` contains public values bundled into the app:

| Variable                        | Purpose                              |
| ------------------------------- | ------------------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase Auth endpoint               |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon client key |
| `EXPO_PUBLIC_API_URL`           | NestJS base URL, including `/api/v1` |

`apps/api/.env` contains server-only values:

| Variable                | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`          | Runtime PostgreSQL connection (session pooler for Supabase) |
| `DIRECT_DATABASE_URL`   | Direct PostgreSQL URL used by Prisma migrations             |
| `SUPABASE_JWT_ISSUER`   | Expected JWT issuer                                         |
| `SUPABASE_JWKS_URL`     | Trusted asymmetric public signing keys                      |
| `SUPABASE_JWT_AUDIENCE` | Expected audience; normally `authenticated`                 |
| `PORT`                  | API listen port                                             |

Never prefix server secrets with `EXPO_PUBLIC_`. Real environment files are ignored by Git.

## Run locally

1. Copy the two `.env.example` files to `.env` in their respective app folders and fill in local values.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Generate and apply the initial application migration against the development database:

   ```sh
   pnpm --filter @cena/api db:generate
   pnpm --filter @cena/api exec prisma migrate dev
   ```

   `prisma.config.ts` reads `DIRECT_DATABASE_URL` for migration commands. `db:generate` does not connect to the database.

4. Start the API with `pnpm --filter @cena/api dev`.
5. Start Expo with `pnpm --filter @cena/mobile start` and open the app on a simulator or device. For a physical device, set `EXPO_PUBLIC_API_URL` to the development machine's LAN address rather than `localhost`.
6. Enter an email address, retrieve the six-digit code from the configured email, verify it, and confirm that Cena opens the existing four-tab app. Sign out from **Profil & inställningar**, then repeat to verify the same household is returned.

The API's health endpoint is `GET /health`. Authenticated API endpoints require `Authorization: Bearer <Supabase access token>`.

## Flow and trust boundaries

- The mobile app requests an email OTP using Supabase Auth `signInWithOtp`, verifies the numeric code using `verifyOtp`, and stores the SDK session through Expo SecureStore. SecureStore uses native platform secure storage; this does not make all device or backup threats impossible.
- Supabase Auth owns the identity, access token, refresh token and session lifecycle. The app starts/stops token auto-refresh with foreground/background transitions and clears the session on sign-out.
- Before rendering a protected route, the app restores the session and calls `POST /api/v1/me/bootstrap`. Network/bootstrap failure blocks protected screens and provides retry; it does not discard a valid session.
- NestJS verifies JWT signatures with the configured JWKS and checks issuer, audience, expiry and the Supabase `authenticated` role. Privileged service-role tokens are rejected. The verified `sub` and email are the only identity inputs used by application services.
- Prisma stores an application `User`, `Household` and `HouseholdMember`. A transaction uses a conditional `provisioningCompleted` update as a single-winner gate. The household and OWNER membership are created atomically; retries return the existing profile. The marker stays complete if memberships are later removed, so bootstrap will not silently recreate a household.
- Household lookups join against the authenticated user's membership. A nonmember receives the same not-found response as an unknown household. Client-supplied ownership or role values are not accepted.
- Prisma connects to PostgreSQL with server credentials. RLS is enabled on the three `public` application tables without client policies, so direct Data API access is denied. The API uses the database owner connection and applies membership authorization in NestJS; no mobile client connects directly to these tables.

## API

| Method | Path                     | Behavior                                                            |
| ------ | ------------------------ | ------------------------------------------------------------------- |
| `POST` | `/api/v1/me/bootstrap`   | Authenticated, idempotent initial provisioning and profile response |
| `GET`  | `/api/v1/me`             | Current application profile and memberships; does not mutate state  |
| `GET`  | `/api/v1/households`     | Membership-scoped household summaries                               |
| `GET`  | `/api/v1/households/:id` | Household details only for a member                                 |

`User.provisioningCompleted` records that initial provisioning was attempted successfully, including for an existing member. Database uniqueness, foreign keys, the membership unique key and the transaction protect consistency. The data model permits a user to belong to multiple households and supports future `MEMBER` roles, but invitations and membership management are intentionally absent.

## Limitations

- Numeric email delivery requires the Supabase dashboard template, suitable SMTP for test recipients, and Auth settings above. No live Supabase project was configured for this change, so delivery, deliverability and end-to-end verification have not been tested.
- JWT verification requires an asymmetric Supabase signing key and a reachable JWKS endpoint. Legacy symmetric signing keys require a separately reviewed verifier change.
- Migrations are local/version-controlled; hosted migration deployment, backups and production operations remain deferred.
- There are no invitations, household switching/management, RLS policies, account deletion, or rate limiting at the API. Recipe and shopping features remain mock data; the household inventory implementation is documented in [inventory.md](inventory.md).
