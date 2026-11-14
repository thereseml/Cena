# Cena

Swedish-first kitchen assistant. This repository contains the minimal mobile/API workspace; no product flows are implemented yet.

## Requirements

- Node.js 22 LTS (or a compatible current LTS)
- pnpm 10 (`corepack enable` and `corepack prepare pnpm@10.20.0 --activate`)
- Expo Go compatible with Expo SDK 58 for iOS/Android receipt OCR. No custom native build is needed for this flow. Web supports manual entry only. See the [receipt import guide](docs/receipt-import.md).

## Get started

```bash
pnpm install --frozen-lockfile
pnpm --filter @cena/mobile dev
pnpm --filter @cena/api dev
```

Mobile: Expo development server (scan the QR code in Expo Go or use a simulator). To explicitly select Expo Go and clear stale Metro state after the OCR dependency change, use `pnpm --filter @cena/mobile exec expo start --go --clear` instead of the mobile `dev` command. `pnpm dev` starts the workspace development servers together. API: `http://localhost:3000/health` returns `{ "status": "ok" }`.

For a phone, keep the computer and phone on the same LAN and set the existing `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to the computer's reachable LAN address, including `/api/v1`. A phone's `localhost` is not the development computer. The API must be reachable from that network for inventory/authenticated API operations; OCR itself runs locally once Metro has delivered the bundled assets. Only public client configuration belongs in `EXPO_PUBLIC_*`, never server secrets.

Useful commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

Prisma 7 is only scaffolded; the connection URL is configured in `apps/api/prisma.config.ts`. Copy `apps/api/.env.example` to `apps/api/.env` and provide a development-only PostgreSQL URL before `pnpm --filter @cena/api db:validate` or `db:generate`. No models, migrations or production database configuration exist yet. Do not run migrations against production.

## Verification

Verified with Node.js 24.22.1 and pnpm 10.20.0:

- Frozen-lockfile dependency install (dependency lifecycle scripts disabled).
- `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build`.
- Built NestJS API startup and real `GET /health` response: HTTP 200, `{ "status": "ok" }`.
- `pnpm --filter @cena/mobile exec pnpm dlx expo-doctor`: 18/18 checks passed.
- `pnpm --filter @cena/mobile exec expo export --platform android --platform ios --output-dir /tmp/cena-mobile-export`: both platform bundles exported.
- Mobile app visually checked in the simulator.
- `pnpm --filter @cena/api db:validate` with a local placeholder URL: schema valid; no database connection tested.

The API currently has one controller unit test. Mobile/contracts test scripts only report that no tests exist; a successful root test command does not imply mobile coverage. `pnpm build` builds only the API; the Expo export above verifies mobile bundling separately, not native installation or rendering.

The simulator visual check does not verify installation or behavior on a physical device. No standalone native iOS/Android build, Supabase connection, authentication or database operations have been tested. Prisma has no domain models yet; do not generate fake models just to run client generation. pnpm blocks dependency lifecycle scripts by default; review specific scripts before enabling them when database/client integration is added.

Commit changes to dependency manifests together with `pnpm-lock.yaml`.

Architecture: [ADRs](docs/adr/README.md). AI development instructions: [AGENTS.md](AGENTS.md) and [manual workflow](docs/development-workflow.md). The historical [blueprint](docs/blueprint.md) must remain unchanged.

Current PR12 scope: [on-device receipt OCR import](docs/receipt-import.md), replacing general product-image recognition under [ADR-0009](docs/adr/0009-receipt-import-ocr.md). [ADR-0010](docs/adr/0010-expo-go-receipt-ocr.md) replaces its ML Kit/custom-build choice with bundled Tesseract.js 7 in an Expo Go WebView, not its receipt-only scope. The guide separates simulator evidence from physical-device and Android checks still required; the scaffold verification above is historical, not a current receipt-OCR test report.
