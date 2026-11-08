# ADR-0001: Mobile platform and monorepo

**Status:** Accepted (product-owner architecture decision, 2026-11-08)

## Context
Cena targets Swedish-first iOS and Android beta. Shared TypeScript tooling allows agents to work across app and API without duplicating contracts.

## Decision
- Use **React Native + Expo + TypeScript** for the iOS and Android app.
- Organize the repository with **pnpm workspaces + Turborepo**, with `apps/mobile`, `apps/api` and shared packages as needed.
- Keep shared packages focused on safe contracts/types; never import server-only secrets or code into mobile.

## Consequences and guardrails
- Expo Router remains the blueprint's proposed navigation default, not a separately approved ADR.
- Turborepo handles tasks/caching; pnpm owns dependencies.
- Do not create unused folders or packages purely to match the blueprint tree.

## Deferred implementation details
Exact workspace package layout, Expo SDK version, package versions, mobile navigation and build profiles.

## References
- [Private beta scope](../mvp-scope.md)
- [Historical architecture](../architecture.md)
- [Original blueprint](../blueprint.md)
