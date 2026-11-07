# Cena — Roadmap, testing, release criteria and open decisions

> Extracted from [the original blueprint](blueprint.md), sections 15, 16, 20, 21, 22, 24, 25. Original section numbering retained. [Documentation index](README.md). Follow [AGENTS.md](../AGENTS.md).

# 15. Development Roadmap

## Phase 0 — Foundation

### Goal

Establish a reliable development environment.

### Tasks

- Create monorepo.
- Configure pnpm.
- Configure Turborepo.
- Initialize Expo app.
- Initialize NestJS API.
- Configure TypeScript.
- Configure ESLint and formatting.
- Configure GitHub Actions.
- Establish environment configuration.
- Configure Supabase.
- Add README and architecture documentation.

### Acceptance Criteria

- Mobile app starts locally.
- API starts locally.
- CI validates pull requests.
- Environment secrets are excluded from Git.
- Shared packages can be imported successfully.

## Phase 1 — Design System

### Goal

Implement Cena's visual foundations.

### Tasks

- Add colors.
- Add typography.
- Add spacing and radius tokens.
- Load DM Sans.
- Build Button.
- Build Text.
- Build Input.
- Build Card.
- Build Badge.
- Build BottomSheet.
- Build loading and empty states.
- Configure navigation.

### Acceptance Criteria

- All primitives use tokens.
- Components support relevant interaction states.
- Main navigation works.
- Screens respect safe areas.
- Accessibility checks pass for implemented components.

## Phase 2 — Authentication & Onboarding

### Tasks

- Registration.
- Login.
- Logout.
- Account recovery.
- Household creation.
- Preference setup.
- Allergy setup.
- Onboarding completion state.

### Acceptance Criteria

- User can create an account.
- User can log in again.
- User preferences persist.
- Protected routes require authentication.
- Household data is isolated.

## Phase 3 — Kitchen Inventory

### Tasks

- Ingredient/product schema.
- Inventory schema.
- Batch support.
- Inventory events.
- Inventory CRUD API.
- Kitchen list screen.
- Product details.
- Manual add/edit flow.
- Search and filters.
- Expiry indicators.

### Acceptance Criteria

- User can add, edit and remove food.
- Quantities are accurate.
- Multiple batches are supported.
- Expiry status is displayed correctly.
- Data persists across sessions.

## Phase 4 — AI Recognition

### Tasks

- Camera/image picker.
- Secure upload.
- AI recognition service.
- Structured response validation.
- Recognition review UI.
- Correction workflow.
- Inventory confirmation.

### Acceptance Criteria

- User can photograph food.
- AI proposes recognizable products.
- User can correct every suggestion.
- Unconfirmed products are not saved.
- Errors are recoverable.

## Phase 5 — Recipes

### Tasks

- Recipe data model.
- Recipe listing.
- Recipe detail screen.
- Recipe generation.
- Inventory matching.
- Allergy validation.
- Missing ingredients.
- Favorites.
- Recipe feedback.

### Acceptance Criteria

- User can discover relevant recipes.
- Ingredient availability is accurate.
- Missing ingredients are visible.
- Allergies are handled as hard restrictions.
- AI responses are schema-validated.

## Phase 6 — Cooking & Shopping

### Tasks

- Cooking mode.
- Portion adjustment.
- Inventory deduction preview.
- Transactional deduction.
- Shopping list CRUD.
- Add missing ingredients.
- Purchased-item handling.

### Acceptance Criteria

- Cooking does not silently modify inventory.
- User confirms deductions.
- Inventory events are recorded.
- Missing ingredients can be added to shopping.
- Shopping changes persist.

## Phase 7 — Home & Meal Planning

### Tasks

- Home overview.
- Expiry recommendations.
- Recipe recommendations.
- Weekly meal planner.
- Add recipes to plan.
- Generate shopping suggestions.

### Acceptance Criteria

- Home provides useful next actions.
- Meal plan persists.
- Planned meals can be changed.
- Shopping suggestions require confirmation.

## Phase 8 — Beta Readiness

### Tasks

- End-to-end testing.
- Accessibility review.
- Performance review.
- Security review.
- Analytics.
- Error monitoring.
- Privacy and terms.
- Beta builds.
- Real-user feedback.
- Bug fixing.

### Acceptance Criteria

- Critical user journeys work on iOS and Android.
- No known critical security vulnerabilities.
- No known critical inventory data-integrity bugs.
- Core AI flows have safe error handling.
- Beta feedback can be collected.

---

---

# 16. Testing Strategy

## 16.1 Unit Tests

Prioritize:

- Inventory calculations.
- Unit conversions.
- Recipe matching.
- Allergy exclusion.
- Expiry status.
- Shopping calculations.
- Permission rules.

## 16.2 Integration Tests

Test:

- Inventory API and database.
- Household authorization.
- Recipe generation validation.
- Cooking transactions.
- Shopping-list operations.
- Authentication boundaries.

## 16.3 End-to-End Tests

Critical journeys:

1. Register and complete onboarding.
2. Add a product manually.
3. Recognize food and confirm.
4. Find a recipe from inventory.
5. Add missing ingredients to shopping.
6. Cook and confirm inventory deduction.
7. Reopen app and verify persisted state.

## 16.4 AI Evaluation

Maintain a small evaluation dataset containing:

- Common Swedish groceries.
- Ambiguous images.
- Incorrect recognition examples.
- Missing quantity cases.
- Allergy scenarios.
- Dietary restrictions.
- Recipe requests with insufficient ingredients.

Measure:

- Recognition usefulness.
- User correction rate.
- Recipe validity.
- Allergy validation failures.
- AI latency.
- AI cost per action.

Never use only successful demo examples as evidence of AI quality.

---

---

# 20. Definition of Done

A feature is done when:

- Requirements are implemented.
- Acceptance criteria are satisfied.
- TypeScript checks pass.
- Relevant tests pass.
- Errors and loading states are handled.
- Accessibility is considered.
- Security and authorization are verified.
- Design system tokens are followed.
- Documentation is updated when necessary.
- No unrelated scope has been introduced.

---

---

# 21. AI Development Agent Instructions

This section defines how AI coding agents should work in the Cena repository.

## 21.1 Source of Truth

Before implementing a feature, read:

1. `docs/blueprint.md`
2. Relevant existing code.
3. Existing architecture decisions.
4. Related tests and conventions.

The blueprint describes intended behavior.

The actual repository describes the current implementation.

If the two conflict, identify the conflict before making significant changes.

## 21.2 Engineering Rules

- Use TypeScript.
- Prefer strict typing.
- Avoid `any` unless justified.
- Follow existing project conventions.
- Prefer small, focused modules.
- Do not introduce dependencies without a reason.
- Do not build abstractions for hypothetical future requirements.
- Reuse shared UI components.
- Use design tokens.
- Validate all external inputs.
- Keep business rules on the server.
- Write tests for important domain logic.
- Do not expose secrets.
- Do not silently change database schemas.

## 21.3 Scope Control

Agents must not:

- Add unrequested features.
- Change product direction.
- Replace the approved design language.
- Introduce microservices without approval.
- Implement future-scope integrations prematurely.
- Modify unrelated modules without justification.

## 21.4 Feature Workflow

For each feature:

1. Understand the requirement.
2. Inspect existing implementation.
3. Identify affected modules.
4. Define a small implementation plan.
5. Implement the smallest complete solution.
6. Add relevant tests.
7. Run available checks.
8. Review security and accessibility.
9. Summarize changes and limitations.

## 21.5 Pull Request Requirements

Every PR should describe:

- What changed.
- Why it changed.
- Related feature or issue.
- How it was tested.
- Any schema changes.
- Any security considerations.
- Screenshots for UI changes when useful.
- Remaining limitations.

## 21.6 AI-Specific Rules

AI coding agents must never assume that AI-generated content is trusted.

Any AI-generated data used in Cena must be:

- Schema-validated.
- Checked against business rules.
- Authorized.
- Reviewed by the user when consequential.

Never implement direct model-to-database writes.

---

---

# 22. MVP Release Criteria

Cena is ready for its first meaningful beta when a new user can:

1. Create an account.
2. Complete onboarding.
3. Add food to their kitchen.
4. Photograph food and confirm recognition.
5. View their inventory.
6. Receive relevant recipe suggestions.
7. Understand missing ingredients.
8. Save and cook a recipe.
9. Confirm inventory deductions.
10. Create a shopping list.
11. Return later and continue using the same data.

The product must also have:

- Reliable authentication.
- Household data isolation.
- Safe AI error handling.
- Basic analytics.
- Error monitoring.
- Privacy information.
- Tested critical flows.

A feature-complete product is not automatically a validated product.

---

---

# 24. Open Decisions

The following decisions remain open:

- Final premium feature limits.
- Final subscription pricing.
- Exact AI model selection.
- Detailed notification strategy.
- Whether household sharing belongs in initial MVP.
- Recipe image generation versus licensed image sources.
- Exact product catalog strategy.
- Offline behavior.
- Long-term localization strategy.
- Detailed data retention periods.
- Final production hosting configuration.
- Whether to include basic meal planning before the first private beta.

Record major decisions in `docs/adr/`.

Do not interpret an open decision as permission to implement an arbitrary solution.

---

---

# 25. Recommended First Implementation

Start with the smallest vertical slice that demonstrates the intended product architecture.

## Vertical Slice 1

**Goal: A user can sign in and manually add an ingredient to their kitchen.**

Implementation order:

1. Monorepo foundation.
2. Expo application.
3. NestJS API.
4. Supabase authentication and database.
5. Design tokens and essential UI primitives.
6. Authentication screens.
7. Household creation.
8. Inventory schema and migrations.
9. Inventory create/list API.
10. Kitchen screen.
11. Manual product form.
12. Unit and integration tests.

### Success Condition

A real user can:

- Sign in.
- Open Kitchen.
- Add "Mjölk, 1 liter, kylskåp".
- See the product in inventory.
- Close the app.
- Open it again.
- Still see the product.

This validates authentication, UI, API, database, persistence and core domain structure before introducing AI complexity.

---
