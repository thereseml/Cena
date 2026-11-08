# Cena

Swedish-first kitchen assistant. This repository contains the minimal mobile/API workspace; no product flows are implemented yet.

## Requirements

- Node.js 22 LTS (or a compatible current LTS)
- pnpm 10 (`corepack enable` and `corepack prepare pnpm@10.20.0 --activate`)
- Expo Go or an emulator for the mobile app

## Get started

```bash
pnpm install --frozen-lockfile
pnpm --filter @cena/mobile dev
pnpm --filter @cena/api dev
```

Mobile: Expo development server (scan QR code or use emulator). API: `http://localhost:3000/health` returns `{ "status": "ok" }`.

Useful commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

Prisma is only scaffolded. Copy `apps/api/.env.example` to `apps/api/.env` and provide a development-only PostgreSQL URL before `pnpm --filter @cena/api db:validate` or `db:generate`. No models, migrations or production database configuration exist yet. Do not run migrations against production.

## Verification

Verified with Node.js 24.22.1 and pnpm 10.20.0:

- Frozen-lockfile dependency install (dependency lifecycle scripts disabled).
- `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build`.
- Built NestJS API startup and real `GET /health` response: HTTP 200, `{ "status": "ok" }`.
- `pnpm --filter @cena/mobile exec pnpm dlx expo-doctor`: 18/18 checks passed.
- `pnpm --filter @cena/mobile exec expo export --platform android --platform ios --output-dir /tmp/cena-mobile-export`: both platform bundles exported.
- `pnpm --filter @cena/api db:validate` with a local placeholder URL: schema valid; no database connection tested.

The API currently has one controller unit test. Mobile/contracts test scripts only report that no tests exist; a successful root test command does not imply mobile coverage. `pnpm build` builds only the API; the Expo export above verifies mobile bundling separately, not native installation or rendering.

A phone/emulator smoke test remains required. No native iOS/Android build, Supabase connection, authentication or database operations have been tested. Prisma has no domain models yet; do not generate fake models just to run client generation. pnpm blocks dependency lifecycle scripts by default; review specific scripts before enabling them when database/client integration is added.

Commit changes to dependency manifests together with `pnpm-lock.yaml`.

Architecture: [ADRs](docs/adr/README.md). AI development instructions: [AGENTS.md](AGENTS.md) and [manual workflow](docs/development-workflow.md). The historical [blueprint](docs/blueprint.md) must remain unchanged.
