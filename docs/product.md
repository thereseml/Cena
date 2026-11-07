# Cena — Product vision, decisions, scope and risks

> Extracted from [the original blueprint](blueprint.md), sections 1, 2, 3, 4, 19, 26, 27. Original section numbering retained. [Documentation index](README.md). Follow [AGENTS.md](../AGENTS.md).

# 1. Project Overview

## 1.1 What is Cena?

Cena is an AI-powered kitchen companion that helps people manage the food they already own, discover what they can cook, plan meals, and shop more intelligently.

Cena combines kitchen inventory, recipes, meal planning, and shopping into one seamless mobile experience.

The product should feel like a personal kitchen assistant rather than an inventory management system.

### Vision

A personal AI assistant that knows your kitchen, understands your food habits, and helps you plan, cook, and shop.

### Brand

**Name:** Cena  
**Brand expression:** cena.  
**Tagline:** Less waste. More taste.  
**Supporting message:** Your kitchen, sorted.

### Core promise

Cena helps users:

1. Save time deciding what to cook.
2. Save money by using food they already own.
3. Reduce unnecessary food waste.
4. Simplify meal planning and grocery shopping.
5. Feel more organized without extra administration.

## 1.2 Product Philosophy

Cena must be:

- **Effortless:** Minimal manual work.
- **Intelligent:** Recommendations based on actual context.
- **Trustworthy:** AI suggestions are transparent and reviewable.
- **Personal:** Adapted to preferences, household and habits.
- **Beautiful:** Warm, minimal and premium.
- **Practical:** Useful in everyday life, not just impressive in demos.

### Primary product principle

> The user should spend less time managing Cena than the time Cena saves them.

This principle takes priority over adding new features.

---

---

# 2. Product Decisions

## 2.1 Confirmed Decisions

| Area | Decision |
|---|---|
| Product name | Cena |
| Product type | AI-powered kitchen assistant |
| Platforms | iOS and Android |
| Launch market | Sweden |
| Launch language | Swedish |
| Target audience | People who cook at home |
| Business model | Freemium + subscription |
| Visual direction | Warm Minimalism |
| AI interaction | Assistant with user confirmation |
| Main navigation | Home, Kitchen, Recipes, Plan, Shop |
| Product priorities | Inventory, recipes, meal planning, shopping |
| Primary objective | Save time, money and food |

## 2.2 Proposed Technical Decisions

These are the implementation defaults unless an architecture decision record (ADR) explicitly changes them.

| Area | Proposed solution |
|---|---|
| Mobile | React Native + Expo |
| Language | TypeScript |
| Navigation | Expo Router |
| Backend | NestJS |
| Database | PostgreSQL |
| Managed services | Supabase |
| AI | OpenAI API |
| Client server-state | TanStack Query |
| Client UI-state | Zustand |
| Validation | Zod / server-side DTO validation |
| Monorepo | pnpm workspaces + Turborepo |
| Mobile builds | Expo EAS |
| Subscriptions | RevenueCat |
| Analytics | PostHog |
| Error monitoring | Sentry |
| CI | GitHub Actions |

Prefer a modular monolith over microservices.

Avoid unnecessary infrastructure during MVP development.

## 2.3 Non-Goals

Cena V1 is not:

- A grocery delivery service.
- A complete nutrition tracker.
- A social network.
- An autonomous grocery purchasing agent.
- A supermarket price-comparison platform.
- A system that guarantees food safety or expiry predictions.

---

---

# 3. Target Audience

## 3.1 Primary Audience

People who cook at home and want an easier way to manage everyday food decisions.

Potential user segments:

- Busy professionals.
- Couples and families.
- People living alone.
- Budget-conscious households.
- People trying to reduce food waste.
- People who struggle to decide what to cook.

Do not design Cena exclusively for families.

## 3.2 Jobs To Be Done

### JTBD-01 — Decide what to cook

When I do not know what to make for dinner, I want Cena to suggest meals based on what I have, so I can decide quickly.

### JTBD-02 — Understand my kitchen

When I am planning meals or shopping, I want to know what food I already have, so I avoid unnecessary purchases.

### JTBD-03 — Prevent food waste

When ingredients are approaching their expiry dates, I want useful suggestions for using them.

### JTBD-04 — Plan my week

When I plan meals for the coming days, I want Cena to help create a realistic meal plan.

### JTBD-05 — Shop efficiently

When I need groceries, I want a shopping list that accounts for what is already available at home.

---

---

# 4. Product Scope

## 4.1 MVP Definition

The MVP must prove that Cena can deliver a useful loop:

**Add food → Understand inventory → Discover recipes → Cook → Update inventory → Shop.**

A user must be able to complete this loop without relying on manually maintained spreadsheets or external services.

## 4.2 MVP Features — P0

### Authentication and onboarding

- Account creation.
- Login and logout.
- Password recovery.
- Basic household setup.
- Household size.
- Dietary preferences.
- Allergies and restrictions.
- Disliked ingredients.
- Initial kitchen setup.

### Kitchen inventory

- Add products manually.
- Add products using a photo.
- Review and correct AI-recognized products.
- Store quantity and unit.
- Choose fridge, freezer or pantry.
- Record expiry dates.
- Edit and remove items.
- Search and filter inventory.
- Display products approaching expiry.

### Recipe discovery

- Browse recipe suggestions.
- Generate recipes using AI.
- Match recipes against available inventory.
- Show available and missing ingredients.
- Filter by cooking time and preferences.
- Save favorite recipes.
- View complete recipe instructions.

### Shopping

- Create and maintain a shopping list.
- Add missing recipe ingredients.
- Mark items as purchased.
- Optionally add purchased items to inventory after confirmation.

### Cooking and inventory

- Select recipe portions.
- View ingredients and instructions.
- Mark recipe as cooked.
- Review proposed ingredient deductions.
- Confirm inventory changes.

## 4.3 Secondary Features — P1

- Weekly meal planner.
- Personalized Home dashboard.
- Contextual AI assistant.
- Basic expiry reminders.
- Improved onboarding.
- Recipe feedback.
- Basic household sharing, if justified by beta feedback.

## 4.4 Future Features — P2

- Receipt scanning.
- Barcode integrations.
- Supermarket integrations.
- Grocery price comparisons.
- Automated replenishment suggestions.
- Advanced nutrition analysis.
- Consumption prediction.
- Voice input.
- Advanced household permissions.
- More sophisticated meal planning.

Do not implement P2 features before the MVP has been validated.

---

---

# 19. Product Risks

## Risk 1 — Inventory Requires Too Much Work

### Mitigation

- Simplify manual entry.
- Support image recognition.
- Allow partial inventories.
- Reduce unnecessary fields.
- Use smart defaults with user review.

## Risk 2 — Inventory Becomes Inaccurate

### Mitigation

- Maintain inventory events.
- Make corrections easy.
- Confirm cooking deductions.
- Avoid automatic assumptions.

## Risk 3 — AI Makes Incorrect Suggestions

### Mitigation

- Structured validation.
- Explicit uncertainty.
- User review.
- Deterministic business logic.
- Evaluation datasets.

## Risk 4 — High AI Costs

### Mitigation

- Rate limits.
- Usage monitoring.
- Caching.
- Efficient model selection.
- Subscription entitlements.

## Risk 5 — Poor Retention

### Mitigation

- Deliver immediate value.
- Minimize setup effort.
- Show useful daily recommendations.
- Test real user workflows early.

---

---

# 26. Long-Term Product Vision

Cena should evolve from a recipe and inventory application into a genuinely useful personal kitchen assistant.

The long-term experience should feel like:

> Cena already knows what I have, understands what I like, and helps me make better food decisions without requiring me to manage everything manually.

Future intelligence may include:

- Predictive shopping suggestions.
- Personalized weekly meal planning.
- Consumption pattern learning.
- Better expiry prioritization.
- Grocery integrations.
- Smarter substitutions.
- Household-level coordination.

However, every new feature must reinforce Cena's core value:

**Less waste. More taste.**

---

---

# 27. Final Product Principles

1. The kitchen is the foundation.
2. Recipes must reflect reality.
3. AI assists; users decide.
4. Food safety is never guessed.
5. Inventory accuracy matters more than automation.
6. Beautiful design must support usability.
7. Fewer steps are better than more features.
8. Business logic must be deterministic where possible.
9. Privacy and security are foundational.
10. Build the smallest useful product, validate, then expand.

---

**Cena — Your kitchen, sorted.**

**Blueprint version:** 2.0  
**Status:** Ready for implementation planning
