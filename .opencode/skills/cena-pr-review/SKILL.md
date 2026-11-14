---
name: cena-pr-review
description: Review Cena pull requests for correctness, security, architecture, maintainability, shared component reuse, Storybook coverage and regressions. Use before merge or when reviewing existing changes.
---

# Cena Pull Request Review

## Purpose

Provide an independent, evidence-based review before code is merged.

## Required context

Read:

- `AGENTS.md`.
- Relevant specifications and ADRs.
- PR description.
- Changed files.
- Related tests.
- Existing implementation patterns.

Review the actual diff, not only the PR description.

## Review priorities

Review in this order:

1. Correctness.
2. Security and authorization.
3. Data integrity.
4. Regression risks.
5. Architecture consistency.
6. Maintainability.
7. UI reuse and Storybook.
8. Documentation.

Do not focus on cosmetic issues while critical problems remain.

## Correctness

Check:

- Requirements are implemented.
- Edge cases are handled.
- Error states are correct.
- State changes are consistent.
- Existing functionality is preserved.
- Tests meaningfully cover behavior.

## Security

Check:

- Authentication.
- Household authorization.
- Secrets.
- Input validation.
- File uploads.
- Sensitive logging.
- External API access.
- Privacy implications.

Cross-household access is a critical concern.

## Database

Check:

- Migration safety.
- Relationships and constraints.
- Transaction boundaries.
- Data preservation.
- Concurrency behavior.
- Inventory history consistency.

Do not approve destructive migrations without explicit authorization.

## UI and Storybook

For UI changes, verify:

- Existing shared components were considered.
- No unnecessary duplicates were introduced.
- Feature-specific components remain appropriately scoped.
- Design tokens are used.
- Accessibility is considered.
- New reusable visual components have stories.
- Materially modified components have updated stories.

Do not demand Storybook stories for nonvisual logic.

## Maintainability

Look for:

- Unnecessary abstractions.
- Large files with unrelated responsibilities.
- Duplicated logic.
- Complex control flow.
- Unclear naming.
- Unsafe TypeScript.
- Unnecessary dependencies.

Do not recommend refactoring solely to reduce line counts.

## Findings

Classify findings:

- Critical — security, data loss or major correctness failure.
- High — significant bug or regression.
- Medium — meaningful maintainability or reliability issue.
- Low — minor improvement.

Each finding should include:

- File and location.
- Description.
- Why it matters.
- Recommended fix.

Only report actionable findings supported by evidence.

Do not invent defects.

## Verification

Review test results and distinguish:

- Actually executed checks.
- Reported but unverified checks.
- Missing coverage.
- Blocked checks.

Do not claim a PR is safe merely because lint and typecheck pass.

## Final report

Provide:

1. Overall assessment.
2. Findings ordered by severity.
3. Missing tests.
4. Storybook/component observations.
5. Remaining risks.
6. Merge readiness recommendation.

Do not merge the PR without Product Owner approval.

**Principle: Find real risks, explain them clearly and avoid unnecessary review noise.**