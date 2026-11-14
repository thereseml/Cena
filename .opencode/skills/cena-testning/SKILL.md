---
name: cena-testing
description: Plan, implement and verify Cena tests across NestJS, Prisma, React Native, Storybook and critical user journeys. Use for testing tasks, regression prevention, bug fixes and feature verification.
---

# Cena Testing and Quality Assurance

## Purpose

Provide reliable evidence that Cena works correctly without creating unnecessary or brittle tests.

## Required context

Read:

- `AGENTS.md`.
- Existing test conventions.
- Relevant implementation.
- Existing test utilities.
- Available package scripts.
- Applicable acceptance criteria.

Do not introduce a new testing framework without justification and approval.

## Testing strategy

Choose tests based on risk.

### Unit tests

Use for:

- Pure calculations.
- Expiry-date logic.
- Quantity validation.
- Formatting.
- Inventory transformations.
- Recipe matching rules.

### Component tests

Use for:

- Form validation.
- Button interactions.
- Loading states.
- Error states.
- Filtering.
- Accessibility behavior.

### API integration tests

Use for:

- Authentication guards.
- Authorization.
- Validation.
- Database operations.
- Transactions.
- Household isolation.

### End-to-end tests

Use for critical journeys where supported:

- Sign in.
- Add food.
- Edit food.
- Delete food.
- Recognize food from a photo.
- Review and save suggestions.

Do not introduce a new E2E framework solely for a small change.

## Storybook verification

For reusable visual components:

- Verify required stories exist.
- Check meaningful variants.
- Check story compatibility with current props.
- Verify Storybook can load or build using supported repository commands.

A successful Storybook build does not prove all components have stories.

Inspect coverage explicitly when relevant.

## Test design

Prefer:

- Deterministic tests.
- Clear test names.
- Realistic fixtures.
- Isolated state.
- Meaningful assertions.
- Minimal mocking.

Avoid:

- Arbitrary timeouts.
- Tests dependent on execution order.
- Excessive snapshots.
- Testing implementation details unnecessarily.
- Live external AI calls in unit tests.

## Security and data integrity

Always consider:

- Unauthorized access.
- Cross-household data leakage.
- Invalid quantities.
- Concurrent requests.
- Partial transaction failures.
- Invalid external input.
- Duplicate submissions.

## Bug-fix workflow

For a reproducible bug:

1. Understand expected behavior.
2. Reproduce the issue.
3. Add a regression test where practical.
4. Fix the root cause.
5. Run the regression test.
6. Run relevant broader checks.

Do not change tests merely to hide a failure.

## Verification reporting

Classify checks as:

- Passed.
- Failed.
- Not run.
- Blocked.

Report the actual commands executed.

Never claim success based only on code inspection.

## Final report

Include:

1. Test coverage added.
2. Commands executed.
3. Results.
4. Regressions checked.
5. Remaining risks.
6. Unverified behavior.

**Principle: Test meaningful behavior and report evidence, not assumptions.**