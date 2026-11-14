---
name: cena-feature
description: Plan and implement complete Cena features across mobile, backend, database and AI using repository conventions, coordinated subagents, tests and focused pull requests. Use for multi-layer features and substantial development tasks.
---

# Cena Feature Development

## Purpose

Coordinate complete feature implementation while maintaining architectural consistency and avoiding unnecessary complexity.

## Required context

Read:

- `AGENTS.md`.
- `docs/blueprint.md`.
- `docs/mvp-scope.md`.
- Relevant accepted ADRs.
- `docs/development-workflow.md`.
- Existing implementation.
- Relevant tests.

Do not assume a roadmap item is approved merely because it exists in documentation.

## Phase 1 — Understand

Identify:

- User problem.
- Approved scope.
- Acceptance criteria.
- Existing functionality.
- Dependencies.
- Security considerations.
- Important unresolved decisions.

Ask for approval when a major decision is unresolved.

## Phase 2 — Inspect

Inspect:

- Existing code.
- Shared components.
- API contracts.
- Database models.
- Tests.
- Storybook.
- Existing patterns.

Avoid duplicating functionality.

## Phase 3 — Plan

For substantial features, define:

1. Domain responsibilities.
2. Data model changes.
3. API contracts.
4. Mobile flows.
5. Shared components.
6. Testing strategy.
7. Migration requirements.
8. Implementation order.

Prefer small, focused PRs when work can be separated safely.

Do not split a complete user journey into unusable fragments unnecessarily.

## Phase 4 — Select relevant skills

Use the relevant skills when available:

- `cena-ui` for visual components and screens.
- `cena-backend` for APIs and database changes.
- `cena-ai` for AI integrations.
- `cena-testing` for test strategy and verification.
- `cena-pr-review` for final review.

Do not load unrelated skills without a reason.

All skills are subordinate to `AGENTS.md` and approved project decisions.

## Phase 5 — Multi-agent coordination

Use subagents when supported and useful.

Before delegation:

- Inspect available agent capabilities.
- Inspect available models.
- Define workstream ownership.
- Agree on shared contracts.
- Identify file conflicts.

Suggested workstreams:

- Backend.
- Mobile.
- AI.
- QA.
- Independent review.

Do not assume fleet-style parallelism is configured.

Do not install a new agent framework without approval.

Use separate worktrees where supported and justified.

Avoid concurrent edits to shared contracts, migrations or configuration.

## Model selection

Choose models based on actual availability and task complexity.

Prefer:

- Strong reasoning models for architecture, security and review.
- Efficient coding models for focused implementation.
- Lower-cost models for simple repetitive tasks.

Do not assume ChatGPT subscriptions provide API credits.

Do not activate paid providers without approval.

Report actual models used when relevant.

## Phase 6 — Implement

Follow approved architecture.

- Reuse existing components.
- Keep code human-readable.
- Implement contracts consistently.
- Preserve authorization.
- Validate external input.
- Add relevant Storybook stories.
- Avoid unrelated changes.

## Phase 7 — Verify

Run available:

- Typechecks.
- Lint.
- Unit tests.
- Integration tests.
- Builds.
- Storybook checks.
- Platform checks.

Verify the complete user journey where possible.

Do not claim checks passed unless executed.

## Phase 8 — Review

Review:

- Acceptance criteria.
- Correctness.
- Security.
- Data integrity.
- Component reuse.
- Storybook coverage.
- Accessibility.
- Error handling.
- Maintainability.

Use an independent reviewer where available.

## Phase 9 — Pull request

Follow the repository Git workflow.

- Work on a feature branch.
- Preserve unrelated changes.
- Commit focused changes.
- Create a PR against `main`.
- Include actual verification results.
- Do not merge without approval.

## Final report

Respond in Swedish with:

1. Feature summary.
2. Architecture decisions.
3. Implementation changes.
4. Agents and models used.
5. Tests actually executed.
6. Remaining risks.
7. PR link.

**Principle: Deliver complete, reliable user value through focused, maintainable changes.**