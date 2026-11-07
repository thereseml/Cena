
# AGENTS.md — Cena AI Development Guidelines

> Project: Cena
> Applies to: All AI coding agents, including OpenAI Codex, GPT-based coding agents, OpenCode, and their subagents.
> Scope: Entire repository
> Primary specification: `docs/blueprint.md`

---


## Documentation routing for GPT/Codex and OpenCode

- Always read `docs/blueprint.md` before implementing a feature, as required by Section 2. Use `docs/README.md` to select focused topic documents for deeper task-specific context; the index does not replace the canonical blueprint.
- `docs/blueprint.md` remains the preserved canonical original. The extracted documents are navigational copies, not new decisions.
- When focused documents conflict with the original, flag the discrepancy and follow the original until a decision is recorded.
- Keep P0, P1 and P2 distinctions intact; do not infer approval for open decisions.
- Inspect the actual repository before assuming proposed architecture has been implemented.
- Both Codex and OpenCode follow this same `AGENTS.md`; do not rely on tool-specific conversation memory.

## 1. Project Identity

Cena is an AI-powered mobile kitchen assistant.

It helps users:

- Manage food inventory.
- Discover recipes based on available ingredients.
- Reduce food waste.
- Plan meals.
- Create shopping lists.
- Make better everyday food decisions.

### Product identity

- Name: Cena
- Brand expression: cena.
- Tagline: Less waste. More taste.
- Platforms: iOS and Android
- Initial market: Sweden
- Initial language: Swedish
- Design direction: Warm Minimalism

### Core principle

**The user should spend less time managing Cena than the time Cena saves them.**

Every implementation decision should support this principle.

---

## 2. Source of Truth

Before implementing any feature, read:

1. `AGENTS.md` — Agent instructions.
2. `docs/blueprint.md` — Product and technical specification.
3. Relevant existing source code.
4. Existing tests and architectural decisions.

### Priority order

When instructions conflict, follow:

1. System and developer instructions from the execution environment.
2. Explicit instructions from the current user.
3. This `AGENTS.md`.
4. `docs/blueprint.md`.
5. Existing repository conventions.

Existing code describes the current implementation, not necessarily the intended product behavior.

If a conflict would require a significant architectural or product decision, explain it and request clarification.

Do not silently override established product decisions.

---

## 3. Agent Operating Principles

All AI agents must follow these rules.

### 3.1 Understand before implementing

Before writing code:

- Inspect the relevant repository structure.
- Identify existing patterns and reusable components.
- Read related types, services, and tests.
- Understand dependencies.
- Identify potential breaking changes.

Never assume a module or file does not exist without checking.

### 3.2 Prefer small, focused changes

Implement the smallest complete solution.

Avoid:

- Unrelated refactoring.
- Premature abstractions.
- Unnecessary dependencies.
- Large architectural rewrites.
- Features outside the requested scope.
- Overengineering.

### 3.3 Preserve existing functionality

Do not break working features to implement new ones.

If a breaking change is necessary:

1. Explain why.
2. Identify affected modules.
3. Update dependent code.
4. Add or update tests.
5. Document the change.

### 3.4 Never fabricate completion

Do not claim that:

- Tests passed unless executed.
- Builds succeeded unless executed.
- A feature works unless verified.
- A deployment succeeded unless confirmed.

Clearly distinguish completed work from unverified assumptions.

---

## 4. Multi-Agent Collaboration

Cena may be developed using multiple AI agents.

Examples:

- GPT / Codex
- OpenCode
- Planning agents
- Frontend agents
- Backend agents
- Testing agents
- Code review agents

All agents share the same project rules.

### 4.1 Shared context

Agents must use repository files as the source of shared context.

Do not rely on conversation history from another agent.

Important decisions must be documented in the repository.

### 4.2 Task ownership

Each agent should work on a clearly defined task.

A task should contain:

- Objective.
- Scope.
- Relevant files or modules.
- Acceptance criteria.
- Dependencies.
- Expected tests.

Avoid assigning overlapping write access to the same files across concurrent agents.

### 4.3 Parallel development

Parallel work is encouraged when tasks are independent.

Good examples:

- One agent implements UI components.
- Another implements an independent backend endpoint.
- Another prepares tests or documentation.

Avoid parallel changes to:

- The same component.
- The same database migration.
- The same API contract.
- Shared configuration files.

Coordinate shared interfaces before parallel implementation.

### 4.4 Git safety

Agents must not:

- Force-push.
- Delete branches without permission.
- Rewrite shared history.
- Discard unrelated changes.
- Commit secrets.
- Merge their own PRs without authorization.

Prefer separate branches or worktrees for concurrent tasks.

Never overwrite uncommitted user changes.

---

## 5. Technology Stack

Use the stack defined in `docs/blueprint.md`. For focused context, use `docs/README.md` to locate the relevant extracted specification.

Current preferred architecture:

### Mobile

- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- Zustand
- React Hook Form
- Zod

### Backend

- Node.js
- NestJS
- TypeScript
- PostgreSQL
- Supabase

### AI

- OpenAI API
- Structured outputs
- Server-side validation
- Explicit user confirmation

### Infrastructure

- pnpm workspaces
- Turborepo
- GitHub Actions
- Expo EAS
- Sentry
- PostHog
- RevenueCat

These are architectural defaults.

Do not introduce replacement technologies without justification and approval.

Do not assume all listed technologies have already been installed.

Inspect the repository before using them.

---

## 6. Architecture Rules

Cena uses a modular monolith architecture.

### Backend

Organize business logic into domain modules:

- Auth
- Households
- Inventory
- Products
- Recipes
- Cooking
- Meal Plans
- Shopping
- AI

Each module should own its:

- Controllers
- Services
- Validation
- Data access
- Tests

### Architecture principles

- Keep business logic on the server.
- Use explicit domain boundaries.
- Avoid circular dependencies.
- Validate all external input.
- Keep database operations transactional where necessary.
- Keep AI integrations isolated from domain logic.
- Use shared types when appropriate.

Do not introduce microservices, event brokers, or distributed infrastructure without a demonstrated need.

---

## 7. TypeScript Standards

Use strict TypeScript.

### Rules

- Prefer explicit types for public interfaces.
- Avoid `any`.
- Prefer `unknown` for untrusted input.
- Use type guards and schema validation.
- Avoid unsafe type assertions.
- Use descriptive names.
- Keep functions focused.
- Avoid unnecessary complexity.

### Naming

- Components: `PascalCase`
- Types/interfaces: `PascalCase`
- Functions: `camelCase`
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` where appropriate
- File naming: follow existing repository conventions

Do not introduce a new naming convention if the repository already has one.

---

## 8. Mobile Development Rules

### 8.1 Component architecture

Prefer reusable components.

Shared UI components belong in:

`apps/mobile/components/ui/`

Domain-specific components belong in:

`apps/mobile/components/product/`

or their relevant feature directory.

### 8.2 State management

Use:

- TanStack Query for server state.
- Zustand for appropriate client-side shared state.
- Local component state for simple UI interactions.

Do not duplicate server state unnecessarily.

### 8.3 UI behavior

Every interactive screen should handle:

- Loading.
- Empty state.
- Success.
- Error.
- Retry.
- Disabled state when applicable.

### 8.4 Accessibility

- Support screen readers.
- Respect dynamic font scaling.
- Use accessible labels.
- Respect touch-target guidelines.
- Do not communicate status using color alone.
- Support reduced motion where relevant.

---

## 9. Cena Design System

All UI work must follow the Cena Design System in `docs/design-system.md` (extracted from `docs/blueprint.md`).

### Visual direction

Warm Minimalism.

The interface should feel:

- Warm.
- Calm.
- Premium.
- Scandinavian.
- Modern.
- Intuitive.
- Food-focused.

Avoid:

- Neon colors.
- Futuristic AI styling.
- Excessive gradients.
- Generic robot imagery.
- Heavy shadows.
- Crowded layouts.
- Unnecessary animations.

### Colors

```typescript
export const colors = {
  forest: "#243C32",
  ivory: "#F8F6F0",
  sage: "#A9BBA4",
  apricot: "#E8B17A",
  mist: "#E9EEE7",
  charcoal: "#252B27",
  success: "#35765B",
  warning: "#A76420",
  error: "#B4483F",
  info: "#476C83",
  border: "#DCE2D9",
};
```

### Typography

Primary font: DM Sans.

### Spacing

Use the spacing scale:

`4, 8, 12, 16, 24, 32, 48`

### Radius

- Input: 12
- Button: 14
- Card: 20
- Modal: 24

### UI implementation requirements

- Use design tokens.
- Reuse existing components.
- Do not hardcode arbitrary colors.
- Do not introduce inconsistent spacing.
- Test text contrast.
- Respect platform conventions.
- Prefer simple layouts.

The brand palette does not automatically guarantee accessible contrast.

---

## 10. Language and Localization

Cena launches in Sweden.

### User-facing content

Use Swedish for:

- Navigation.
- Buttons.
- Form labels.
- Errors.
- Notifications.
- Onboarding.
- Recipes and assistant responses by default.

### Code

Use English for:

- Variables.
- Functions.
- Types.
- Classes.
- File names.
- API contracts.
- Technical documentation.

### Localization

Avoid embedding user-facing text deeply inside business logic.

Prefer a localization-friendly structure.

Do not introduce additional launch languages unless requested.

---

## 11. Database Rules

### Data integrity

- Use version-controlled migrations.
- Enforce appropriate constraints.
- Use transactions for related mutations.
- Prevent negative inventory quantities.
- Preserve inventory event history.
- Respect household ownership.
- Never rely only on client-side validation.

### Inventory

Maintain the distinction between:

- Ingredient
- Product
- InventoryItem
- ProductBatch
- InventoryEvent

Do not simplify these concepts in ways that prevent batch-level expiry tracking.

### Authorization

Every household-owned resource must be scoped and authorized.

Never trust a household ID supplied by the client without checking membership and permissions.

### Migrations

Agents must not:

- Drop production tables without approval.
- Delete existing data without approval.
- Rewrite applied migrations.
- Introduce destructive migrations silently.

---

## 12. AI Integration Rules

AI is an assistant, not the source of truth.

### AI may

- Recognize food from images.
- Suggest recipes.
- Recommend substitutions.
- Prepare meal plans.
- Suggest shopping items.
- Explain food-related information.

### AI must not

- Directly modify the database.
- Automatically purchase groceries.
- Delete inventory without confirmation.
- Modify allergy settings without authorization.
- Bypass business rules.
- Make unsupported food-safety guarantees.

### Structured outputs

Validate AI-generated data before using it.

Required validation includes:

- Schema.
- Data types.
- Allowed values.
- Business constraints.
- Authorization.
- Allergy and dietary rules where applicable.

### Human confirmation

Require confirmation before consequential changes, including:

- Adding AI-recognized products.
- Deducting ingredients after cooking.
- Applying assistant-generated shopping-list changes.
- Updating household preferences.

### Food safety

Distinguish:

- Best before.
- Use by.
- Estimated expiry.

Never treat AI-estimated dates as verified package information.

Never claim a recipe is allergy-safe unless compatibility has been appropriately validated.

### AI cost

- Minimize unnecessary requests.
- Monitor usage.
- Apply rate limits.
- Use caching when safe.
- Handle timeouts.
- Avoid sending unnecessary personal information.

---

## 13. API Standards

Use REST conventions defined in the blueprint.

### Requirements

- Versioned API paths.
- Consistent response formats.
- Validated request bodies.
- Authentication.
- Authorization.
- Predictable error handling.
- Appropriate HTTP status codes.
- Request tracing where practical.

Do not expose internal stack traces to users.

Avoid breaking API contracts without updating affected clients and tests.

---

## 14. Security Rules

Security is mandatory.

### Never

- Commit API keys.
- Expose Supabase service-role credentials.
- Put OpenAI API keys in the mobile application.
- Log passwords or tokens.
- Trust client-provided authorization claims.
- Execute unvalidated model-generated commands.
- Store unnecessary personal information.

### Always

- Validate input.
- Verify permissions.
- Use environment variables for secrets.
- Apply least privilege.
- Protect private uploads.
- Handle errors safely.
- Review dependencies for security concerns.

Follow GDPR-related requirements from the blueprint.

---

## 15. Testing Requirements

Testing is part of implementation.

### Unit tests

Prioritize:

- Inventory calculations.
- Quantity and unit handling.
- Expiry logic.
- Recipe matching.
- Allergy restrictions.
- Shopping-list calculations.
- Authorization rules.

### Integration tests

Cover:

- API endpoints.
- Database operations.
- Household isolation.
- Inventory transactions.
- AI response validation.

### End-to-end tests

Cover critical user journeys.

### Before completion

Run the relevant available commands, such as:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Only run commands that exist in the repository.

Do not claim tests passed if they were not executed.

---

## 16. Git and Pull Request Workflow

Prefer feature branches.

Example:

```text
feature/inventory-manual-entry
feature/recipe-matching
fix/inventory-quantity-validation
refactor/design-tokens
```

### Commit conventions

Prefer conventional commits:

```text
feat: add manual inventory entry
fix: prevent negative inventory quantities
refactor: extract shared recipe card
test: cover inventory deduction
docs: update architecture decisions
```

### Pull request description

Include:

1. Summary.
2. Reason for change.
3. Main implementation details.
4. Tests performed.
5. Screenshots for UI changes when applicable.
6. Risks or limitations.

Do not merge or deploy without the required authorization.

---

## 17. Task Execution Workflow

For every development task, follow this process.

### Step 1 — Understand

Read the request and relevant specifications.

Identify:

- Goal.
- Scope.
- Acceptance criteria.
- Dependencies.
- Potential risks.

### Step 2 — Inspect

Read existing relevant code.

Check for reusable logic and components.

### Step 3 — Plan

For non-trivial tasks, provide a concise implementation plan.

For small changes, proceed directly if the scope is clear.

### Step 4 — Implement

Make focused changes.

Follow repository conventions.

Avoid unrelated work.

### Step 5 — Verify

Run relevant:

- Type checks.
- Lint checks.
- Tests.
- Builds when practical.

### Step 6 — Review

Check:

- Product requirements.
- Data integrity.
- Security.
- Accessibility.
- Design consistency.
- Error handling.

### Step 7 — Report

Summarize:

- What changed.
- Files affected.
- Tests performed.
- Remaining issues.
- Any decisions requiring user input.

---

## 18. Definition of Done

A task is complete when:

- Requested functionality is implemented.
- Acceptance criteria are met.
- Relevant tests pass.
- Type checking passes.
- No known critical errors remain.
- Security requirements are respected.
- UI follows the design system.
- Loading and error states are handled.
- Documentation is updated if needed.

If verification is incomplete, explicitly report that limitation.

---

## 19. Decision-Making Authority

Agents may independently decide:

- Local implementation details.
- Internal naming.
- Small refactoring within scope.
- Appropriate tests.
- Reuse of existing components.
- Minor accessibility improvements.

Agents must request approval for:

- Major architecture changes.
- New paid services.
- Significant new dependencies.
- Changes to product scope.
- Changes to subscription logic.
- Destructive database operations.
- Major design-system changes.
- Production deployment.
- Deletion of significant existing functionality.

When uncertain, prefer the simplest reversible solution.

---

## 20. Development Priorities

Follow the implementation sequence in `docs/delivery.md` (extracted from `docs/blueprint.md`).

Initial priorities:

1. Repository foundation.
2. Design system.
3. Authentication and onboarding.
4. Kitchen inventory.
5. AI food recognition.
6. Recipe discovery and matching.
7. Cooking and inventory deductions.
8. Shopping lists.
9. Home and meal planning.
10. Beta testing and release.

Do not build future features before their dependencies are ready.

---

## 21. Communication Style

When communicating with the project owner:

- Respond in Swedish unless requested otherwise.
- Be concise and specific.
- Explain important technical trade-offs.
- Avoid unnecessary jargon.
- Identify assumptions.
- Explain why significant changes are needed.
- Recommend practical next steps.

For technical explanations, prefer:

1. Why the change is needed.
2. How it works.
3. What will change.
4. How it will be verified.

Do not overwhelm the user with unnecessary implementation details.

---

## 22. Final Agent Checklist

Before completing any task, verify:

- [ ] I followed the blueprint.
- [ ] I inspected relevant existing code.
- [ ] I stayed within scope.
- [ ] I reused existing patterns.
- [ ] I respected the design system.
- [ ] I validated external inputs.
- [ ] I checked authorization where relevant.
- [ ] I handled errors and loading states.
- [ ] I added or updated relevant tests.
- [ ] I ran available verification commands.
- [ ] I did not expose secrets.
- [ ] I did not overwrite unrelated changes.
- [ ] I documented significant decisions.
- [ ] I accurately reported what was completed.

---

## 23. Guiding Principle

**Build Cena as a real product, not as a collection of AI-generated features.**

Prioritize:

- Product usefulness.
- Maintainable architecture.
- Reliable behavior.
- Consistent design.
- User trust.
- Fast iteration.

The goal is not to write the most code.

The goal is to build the simplest, most reliable version of Cena that delivers meaningful value.

**Cena — Less waste. More taste.**
