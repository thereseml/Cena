# Cena

Swedish-first kitchen assistant. This repository contains the minimal mobile/API workspace; no product flows are implemented yet.

## Requirements

- Node.js 22 LTS (or a compatible current LTS)
- pnpm 10 (`corepack enable` and `corepack prepare pnpm@10.20.0 --activate`)
- Expo Go or an emulator for the mobile app

## Get started

```bash
pnpm install
pnpm --filter @cena/mobile dev
pnpm --filter @cena/api dev
```

Mobile: Expo development server (scan QR code or use emulator). API: `http://localhost:3000/health` returns `{ "status": "ok" }`.

Useful commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

Prisma is only scaffolded. Copy `apps/api/.env.example` to `apps/api/.env` and provide a development-only PostgreSQL URL before `pnpm --filter @cena/api db:validate` or `db:generate`. No models, migrations or production database configuration exist yet. Do not run migrations against production.

**Important:** A pnpm lockfile is not yet committed. Run `pnpm install` and commit the generated `pnpm-lock.yaml` before treating builds as reproducible. Validate installed package compatibility with Expo Doctor. No installation or runtime checks have been performed in this documentation-only environment.

Architecture: [ADRs](docs/adr/README.md). AI development instructions: [AGENTS.md](AGENTS.md) and [manual workflow](docs/development-workflow.md). The historical [blueprint](docs/blueprint.md) must remain unchanged.
