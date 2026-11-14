---
name: cena-ui
description: Develop and refactor Cena React Native UI using existing shared components, the approved design system, and Storybook. Use for all UI implementation, component creation, and visual refactoring tasks.
---

# Cena UI Development Skill

## Purpose

Ensure every UI change in Cena follows a consistent component-first development process.

## Step 1 — Inspect before coding

Read:

- `AGENTS.md`
- Relevant design-system documentation
- Existing components in `packages/ui`
- Existing Storybook stories
- Relevant feature components

Identify what can be reused.

## Step 2 — Choose component ownership

Use `packages/ui` for generic reusable presentation components.

Use feature directories for domain-specific components.

Prefer composition of existing components.

Avoid unnecessary abstractions and duplicate implementations.

## Step 3 — Implement

Follow Cena's approved design tokens and React Native conventions.

Requirements:

- Strict TypeScript
- Accessible interactions
- Clear props
- Small, cohesive components
- Consistent spacing
- Responsive layouts
- No hardcoded arbitrary colors
- No unnecessary dependencies

## Step 4 — Storybook

For every new or materially changed reusable visual component:

- Add or update stories.
- Follow existing story naming conventions.
- Include relevant visual states.
- Use Swedish sample content.
- Avoid live API dependencies.
- Verify stories render.

Prefer representative stories over excessive combinations.

## Step 5 — Integrate

Use the shared component in the actual application.

Avoid duplicating styling or behavior at screen level.

Preserve existing navigation and business functionality.

## Step 6 — Verify

Run the relevant repository checks.

Verify:

- TypeScript
- Lint
- Component tests
- Storybook
- Accessibility
- Mobile layout

Report any checks that could not be run.

## Step 7 — Report

In the final implementation report, include:

1. Existing components reused.
2. Existing components extended.
3. New components created.
4. Storybook stories added or updated.
5. Tests and verification results.
6. Remaining limitations.

## Core principle

**Reuse first. Create only when necessary. Document reusable visual components in Storybook.**