# Manual AI-assisted development — Cena

Cena uses **one manually instructed AI coding assistant at a time** (Codex, OpenCode or equivalent). There is no agent team, automatic Issue pickup, workflow trigger, or background execution configured by this guide.

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

## Example manual prompt

> Implement the initial Expo mobile navigation according to Cena's approved architecture and design system. Inspect the repository first. Limit the changes to navigation and the minimum necessary dependencies. Add appropriate tests, run available checks, create a PR, and do not merge. Ask before resolving any open architecture decisions.

This process can evolve later, but automation requires a separate, explicit decision and security review.
