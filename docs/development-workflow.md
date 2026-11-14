# Manual AI-assisted development — Cena

Cena uses **one manually instructed AI coding assistant at a time** (Codex, OpenCode or equivalent). There is no agent team, automatic Issue pickup, agent workflow trigger, or background agent execution configured by this guide.

## Before each task

1. Product Owner gives a concrete goal, scope, acceptance criteria and any constraints directly to the assistant.
2. Assistant reads `AGENTS.md`, `docs/README.md`, `docs/mvp-scope.md`, relevant accepted ADRs and topic docs, then inspects actual code and tests.
3. Check unresolved implementation gates in `docs/adr/README.md`. Ask the owner to resolve material product or architecture decisions rather than silently choosing.
4. Agree on the smallest implementation; do not assume every documented technology is installed.

## Implement and verify

1. Use a dedicated branch, keeping changes focused; do not touch unrelated files or `docs/blueprint.md`.
2. Follow approved stack and Swedish-first Warm Minimalism UX. Apply household isolation, privacy, AI validation and explicit user confirmation where relevant.
3. Add/update tests where meaningful. Run available lint, typecheck, tests and build checks as appropriate. State commands and actual results; if the repo has no scripts yet, say so rather than inventing results.
4. If blocked or if scope would expand, stop and ask. Never use production credentials, deploy, or change live data without explicit separate authorization.

## Handoff and review

1. When requested, create a PR against `main` with the repository PR template, including linked task (if one exists), summary, acceptance evidence, checks performed, known limitations and risks.
2. Product Owner reviews and decides whether to merge. AI must not merge, force-push or rewrite shared history without explicit authorization.
3. GitHub Issues and labels are **optional organizational aids**; they never authorize or trigger agent execution.

## Pull request CI

`.github/workflows/ci.yml` runs automatically when a pull request targeting `main` is opened, reopened or updated. It does not run on pushes or after merging into `main`. A newer PR revision cancels the previous in-progress run.

The workflow uses Node.js 24, the pnpm version from `package.json`, a frozen lockfile and a cached pnpm store. It validates the Prisma schema, generates the Prisma client, then runs `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` across the workspaces. The build includes the NestJS API and Expo exports for mobile platforms. Actions are pinned to commit SHAs; the existing Dependabot configuration proposes action updates.

CI needs no repository secrets, live database or external API access. Tests use their existing mocks; schema validation and client generation do not apply migrations. The workflow has read-only repository permissions and does not deploy, commit, push or merge.

The contracts workspace currently has only a placeholder test script. Successful CI does not verify live authentication, database migrations, native app installation, Storybook rendering or end-to-end journeys on devices. Record any additional manual verification in the existing PR template.

To enforce CI before merging, configure a branch protection rule or ruleset for `main` requiring `Lint, types, tests and build`. This repository setting is separate from the workflow file and must be enabled by a repository administrator.

## Example manual prompt

> Implement the initial Expo mobile navigation according to Cena's approved architecture and design system. Inspect the repository first. Limit the changes to navigation and the minimum necessary dependencies. Add appropriate tests, run available checks, create a PR, and do not merge. Ask before resolving any open architecture decisions.

This process can evolve later, but automation requires a separate, explicit decision and security review.
