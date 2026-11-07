
# Cena — Product & Engineering Blueprint

> Version: 1.0  
> Status: Approved product direction / Implementation specification  
> Product: Cena  
> Platform: iOS & Android  
> Initial market: Sweden  
> Initial language: Swedish  
> Design direction: Warm Minimalism  
> Design system: Cena Design System v1.0

---

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

# 5. User Experience Architecture

## 5.1 Main Navigation

Cena uses five bottom navigation destinations.

1. **Home** — Overview and recommendations.
2. **Kitchen** — Food inventory.
3. **Recipes** — Recipe discovery and cooking.
4. **Plan** — Meal planning.
5. **Shop** — Shopping lists.

The AI assistant is accessible contextually from relevant screens.

Profile and settings are accessible through the account entry point.

Food scanning is an action within Kitchen, not a separate tab.

## 5.2 Primary User Journey

### First-time user

1. Open Cena.
2. Create account.
3. Set household size.
4. Set food preferences and allergies.
5. Add initial kitchen ingredients.
6. View personalized Home.
7. Discover recipes.
8. Choose a recipe.
9. Cook and confirm ingredient usage.
10. Add missing ingredients to shopping list.

### Returning user

1. Open Home.
2. See useful food reminders.
3. Choose a recommended recipe.
4. Review ingredients.
5. Cook or plan the recipe.
6. Update inventory with confirmation.

## 5.3 UX Requirements

- Important actions should be immediately discoverable.
- Avoid unnecessary screens and confirmations.
- Use progressive disclosure.
- Always provide clear feedback.
- Show loading, empty, success and error states.
- Never make uncertain AI output look verified.
- Support large text and screen readers.
- Never use color as the only status indicator.

### UX Performance Targets

| Action | Initial target |
|---|---|
| Manually add an ingredient | Under 30 seconds |
| Find a relevant recipe | Under 30 seconds |
| Open kitchen inventory | Under 2 seconds under normal conditions |
| Recognize food from image | Target under 15 seconds |
| Generate recipe | Target under 10 seconds |

These are product targets, not guaranteed response times.

---

# 6. Cena Design System

## 6.1 Design Direction

**Warm Minimalism**

A modern Scandinavian food lifestyle experience combining:

- Premium simplicity.
- Warmth and approachability.
- Editorial food photography.
- Natural colors.
- Spacious layouts.
- Subtle interaction feedback.

Cena must not look like a generic AI dashboard.

Avoid:

- Neon colors.
- Futuristic gradients.
- Robot illustrations.
- Excessive shadows.
- Crowded dashboards.
- Unnecessary AI labels.
- Overly playful food illustrations.

## 6.2 Color Tokens

### Brand Colors

| Token | Hex | Usage |
|---|---|---|
| forest | `#243C32` | Primary brand |
| ivory | `#F8F6F0` | Main background |
| sage | `#A9BBA4` | Secondary |
| apricot | `#E8B17A` | Accent |
| mist | `#E9EEE7` | Highlight surface |
| charcoal | `#252B27` | Primary text |

### Semantic Colors

| Token | Hex |
|---|---|
| success | `#35765B` |
| warning | `#A76420` |
| error | `#B4483F` |
| info | `#476C83` |
| border | `#DCE2D9` |

### Example Token Definition

```typescript
export const colors = {
  brand: {
    primary: "#243C32",
    secondary: "#A9BBA4",
    accent: "#E8B17A",
  },
  background: {
    primary: "#F8F6F0",
    elevated: "#FFFFFF",
    subtle: "#E9EEE7",
  },
  text: {
    primary: "#252B27",
    inverse: "#FFFFFF",
  },
  semantic: {
    success: "#35765B",
    warning: "#A76420",
    error: "#B4483F",
    info: "#476C83",
  },
  border: "#DCE2D9",
} as const;
```

All color combinations must be contrast-tested before release.

Do not assume every brand color is suitable for small text.

## 6.3 Typography

Primary font: **DM Sans**

Optional marketing-only display font: **DM Serif Display**

| Token | Size | Weight |
|---|---|---|
| display | 36 | 700 |
| h1 | 28 | 700 |
| h2 | 22 | 600 |
| h3 | 18 | 600 |
| body | 16 | 400 |
| bodySmall | 14 | 400 |
| label | 14 | 600 |
| caption | 12 | 500 |

Requirements:

- Respect system font scaling.
- Avoid fixed-height text containers.
- Maintain readable line height.
- Use consistent typography tokens.

## 6.4 Spacing

Spacing scale:

```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
```

Screen horizontal padding: `20`.

## 6.5 Border Radius

```typescript
export const radius = {
  input: 12,
  button: 14,
  card: 20,
  modal: 24,
  pill: 999,
} as const;
```

## 6.6 Icons

Use Lucide icons consistently.

Recommended stroke width: 1.75–2.

Avoid mixing unrelated icon libraries.

## 6.7 Touch Targets

- iOS: minimum 44 × 44 pt.
- Android: minimum 48 × 48 dp.

## 6.8 Component Hierarchy

### Foundations

- Colors
- Typography
- Spacing
- Radius
- Icons
- Motion

### Primitives

- Button
- Text
- Input
- Card
- Badge
- IconButton
- Modal
- BottomSheet
- Tabs
- Skeleton
- EmptyState
- ErrorState

### Product Components

- IngredientCard
- RecipeCard
- ExpiryBadge
- PantrySelector
- QuantityInput
- IngredientAvailability
- MealPlanCard
- ShoppingListItem
- AIRecognitionReview
- InventoryDeductionReview

## 6.9 Component Rules

Every shared component must:

- Use design tokens.
- Support accessible labels where needed.
- Support disabled and loading states where relevant.
- Avoid hardcoded colors and spacing.
- Have clearly typed props.
- Remain independent of business logic where possible.

---

# 7. Screen Specifications

## 7.1 Welcome

### Purpose

Introduce Cena and guide the user to registration.

### Elements

- Cena logo.
- Brand statement.
- Editorial food image.
- Primary CTA: "Kom igång".
- Secondary CTA: "Logga in".

### Requirements

- Minimal content.
- Clear hierarchy.
- Accessible controls.

## 7.2 Onboarding

### Purpose

Collect the minimum information required for useful recommendations.

### Information

- Household size.
- Dietary preferences.
- Allergies.
- Disliked ingredients.
- Optional cooking preferences.

### Requirements

- Short onboarding.
- Allow skipping optional questions.
- Clearly distinguish allergies from preferences.
- Allow later editing.

## 7.3 Home

### Purpose

Answer:

**"What should I do with my kitchen today?"**

### Sections

1. Personalized greeting.
2. Primary recipe discovery CTA.
3. Kitchen overview.
4. Products to use soon.
5. Recommended recipes.
6. Quick actions.

### Example

```text
God kväll!

Vad vill du laga idag?

[Hitta något att laga]

Ditt kök
42 varor hemma
5 behöver användas snart

Använd snart
[Tomater] [Grädde]

Förslag för dig
[Recipe Card]
[Recipe Card]
```

### Requirements

- Show actionable information.
- Avoid irrelevant statistics.
- Handle empty inventory gracefully.
- Explain why recipes are recommended.

## 7.4 Kitchen

### Purpose

Give the user a clear overview of available food.

### Features

- Search.
- Storage filters.
- Ingredient list.
- Expiry indicators.
- Add item action.
- Camera recognition action.

### Storage Categories

- Kylskåp.
- Frys.
- Skafferi.

### Ingredient Card

Display:

- Product name.
- Quantity and unit.
- Storage location.
- Expiry status.
- Optional image.

## 7.5 Add Product

### Methods

1. Manual entry.
2. AI image recognition.

### Manual Fields

- Name.
- Quantity.
- Unit.
- Storage location.
- Expiry date.
- Expiry type.

### AI Flow

1. Capture or upload image.
2. Display recognition progress.
3. Return proposed products.
4. User reviews.
5. User corrects details.
6. User confirms.
7. Save to inventory.

Never save AI-recognized products automatically without review.

## 7.6 Recipes

### Purpose

Help users discover meals they can realistically prepare.

### Features

- Recommended recipes.
- Recipe search.
- AI recipe generation.
- Filters.
- Favorites.
- Ingredient availability.

### Recipe Card

Display:

- Recipe image.
- Name.
- Preparation time.
- Difficulty, if available.
- Ingredient availability.
- Missing ingredient count.

## 7.7 Recipe Details

### Elements

- Hero image.
- Recipe title.
- Description.
- Time.
- Portions.
- Ingredient list.
- Availability indicators.
- Instructions.
- Missing ingredient CTA.
- Cook CTA.
- Save CTA.

### Actions

- Adjust portions.
- Add missing ingredients to shopping.
- Save recipe.
- Start cooking.

## 7.8 Cooking Mode

### Purpose

Provide a focused cooking experience.

### Features

- Step-by-step instructions.
- Ingredient overview.
- Adjustable portions.
- Progress indicator.
- Finish cooking.

### Completion

After cooking, display proposed inventory deductions.

The user must confirm before inventory is changed.

## 7.9 Meal Planner

### Purpose

Help organize upcoming meals.

### Features

- Weekly overview.
- Assign recipes to dates.
- Remove or replace meals.
- Generate suggestions.
- Add missing ingredients to shopping.

Advanced automated planning is not required for the first MVP milestone.

## 7.10 Shopping

### Purpose

Maintain a practical grocery shopping list.

### Features

- Add items.
- Edit quantity.
- Mark purchased.
- Remove items.
- Add ingredients from recipes.
- Group by category where possible.

Purchased items may be suggested for inventory addition.

Do not automatically assume purchased items have entered inventory.

## 7.11 AI Assistant

### Purpose

Help users with contextual food questions.

Example questions:

- "Vad kan jag laga ikväll?"
- "Vad behöver jag handla?"
- "Hur kan jag använda min grädde?"
- "Ge mig tre snabba middagar."
- "Kan jag byta ut en ingrediens?"

The assistant must use available kitchen context when authorized.

It must distinguish between:

- Known facts.
- Estimates.
- Suggestions.
- Missing information.

## 7.12 Settings

### Features

- Account.
- Household.
- Dietary preferences.
- Allergies.
- Notifications.
- Subscription.
- Privacy.
- Data export.
- Account deletion.

---

# 8. Technical Architecture

## 8.1 Architecture Principles

- Mobile-first.
- TypeScript-first.
- Modular monolith.
- Strong domain boundaries.
- Server-side business logic.
- AI outputs are untrusted input.
- Database is the source of truth.
- User authorization on every protected resource.
- Simple infrastructure before complex infrastructure.

## 8.2 System Overview

```text
                  CENA MOBILE
              React Native / Expo
                       |
                       |
                  HTTPS / REST
                       |
                       v
                  NESTJS API
                       |
       +---------------+---------------+
       |               |               |
       v               v               v
   Domain Logic     AI Service     Auth Service
       |               |               |
       v               v               v
   PostgreSQL       OpenAI API      Supabase Auth
       |
       v
   Inventory
   Recipes
   Meal Plans
   Shopping
   Households

   Additional services:
   - Supabase Storage
   - RevenueCat
   - PostHog
   - Sentry
```

## 8.3 Repository Structure

```text
cena/
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── product/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── onboarding/
│   │   │   ├── home/
│   │   │   ├── kitchen/
│   │   │   ├── recipes/
│   │   │   ├── cooking/
│   │   │   ├── planner/
│   │   │   ├── shopping/
│   │   │   └── assistant/
│   │   ├── design-system/
│   │   │   ├── tokens/
│   │   │   └── theme/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── assets/
│   │
│   └── api/
│       └── src/
│           ├── modules/
│           │   ├── auth/
│           │   ├── households/
│           │   ├── inventory/
│           │   ├── products/
│           │   ├── recipes/
│           │   ├── cooking/
│           │   ├── meal-plans/
│           │   ├── shopping/
│           │   └── ai/
│           ├── common/
│           ├── config/
│           └── database/
│
├── packages/
│   ├── shared-types/
│   ├── validation/
│   ├── api-client/
│   └── config/
│
├── docs/
│   ├── adr/
│   └── api/
│
├── .github/
│   └── workflows/
│
├── CENA_BLUEPRINT.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

The structure is a target architecture, not a requirement to create every folder immediately.

## 8.4 Backend Modules

Each domain module should own its:

- Controllers.
- Services.
- Validation.
- Domain rules.
- Data access.
- Tests.

Avoid circular dependencies.

Use explicit interfaces when crossing module boundaries.

---

# 9. Data Model

## 9.1 Core Entities

### User

```text
id
email
display_name
language
created_at
updated_at
```

Authentication credentials are managed by the authentication provider.

### Household

```text
id
name
created_at
updated_at
```

### HouseholdMember

```text
id
household_id
user_id
role
created_at
```

### UserPreference

```text
id
user_id
household_size
dietary_preferences
disliked_ingredients
cooking_preferences
updated_at
```

Allergies must be stored in a structured, queryable format rather than relying only on free text.

### Ingredient

```text
id
name
normalized_name
category
created_at
```

Represents a generic ingredient.

Example: "Mjölk".

### Product

```text
id
ingredient_id
name
brand
barcode
default_unit
created_at
```

Represents a specific product or product definition.

Example: "Arla Mellanmjölk 1,5%".

The distinction between Product and Ingredient is important for recipe matching.

### InventoryItem

```text
id
household_id
product_id
quantity
unit
storage_location
created_at
updated_at
```

### ProductBatch

```text
id
inventory_item_id
quantity
purchase_date
expiry_date
expiry_type
expiry_source
opened_at
created_at
```

A product may have multiple batches with different expiry dates.

### InventoryEvent

```text
id
household_id
inventory_item_id
product_batch_id
event_type
quantity_delta
source
created_at
```

Event types:

```text
PURCHASED
CONSUMED
ADJUSTED
DISCARDED
EXPIRED
TRANSFERRED
```

Inventory events should provide traceability for quantity changes.

### Recipe

```text
id
title
description
instructions
prep_time_minutes
cook_time_minutes
servings
image_url
source
created_at
```

### RecipeIngredient

```text
id
recipe_id
ingredient_id
quantity
unit
optional
```

### RecipeFeedback

```text
id
recipe_id
user_id
rating
feedback
created_at
```

### MealPlan

```text
id
household_id
name
start_date
end_date
created_at
```

### MealPlanItem

```text
id
meal_plan_id
recipe_id
planned_date
meal_type
servings
```

### ShoppingList

```text
id
household_id
name
created_at
updated_at
```

### ShoppingListItem

```text
id
shopping_list_id
ingredient_id
name
quantity
unit
is_purchased
created_at
```

### AIInteraction

```text
id
user_id
household_id
interaction_type
status
model
token_usage
estimated_cost
created_at
```

Do not store full prompts or private conversation content by default.

## 9.2 Data Rules

- Every household-owned resource must be scoped by household.
- Every operation must verify authorization.
- Inventory quantity must not become negative.
- Quantity changes must be transactional.
- Units must be validated and normalized where possible.
- AI may propose changes but cannot directly commit them.
- All schema changes must use version-controlled migrations.

## 9.3 Expiry Rules

Cena must distinguish:

- `BEST_BEFORE` — Bäst före.
- `USE_BY` — Sista förbrukningsdag.

Expiry source:

- `USER_ENTERED`
- `PACKAGE_RECOGNIZED`
- `ESTIMATED`

Estimated expiry dates must be clearly labeled.

Never silently replace an actual package date with an AI estimate.

Never present estimated shelf life as a food-safety guarantee.

---

# 10. API Specification

Base path:

```text
/api/v1
```

## 10.1 Authentication

```http
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/password-reset
GET  /auth/me
```

Authentication endpoints must be aligned with the chosen Supabase Auth flow; avoid duplicating identity management unnecessarily.

## 10.2 Households

```http
GET    /households/current
PATCH  /households/current
GET    /households/current/members
```

## 10.3 Inventory

```http
GET    /inventory
POST   /inventory
GET    /inventory/:id
PATCH  /inventory/:id
DELETE /inventory/:id

GET    /inventory/expiring
GET    /inventory/events

POST   /inventory/recognize
POST   /inventory/recognitions/:id/confirm
```

## 10.4 Recipes

```http
GET    /recipes
GET    /recipes/:id

POST   /recipes/generate
POST   /recipes/match

POST   /recipes/:id/favorite
DELETE /recipes/:id/favorite

POST   /recipes/:id/feedback
POST   /recipes/:id/cooked
```

## 10.5 Meal Plans

```http
GET    /meal-plans
POST   /meal-plans
GET    /meal-plans/:id
PATCH  /meal-plans/:id
DELETE /meal-plans/:id

POST   /meal-plans/:id/items
DELETE /meal-plans/:id/items/:itemId
```

## 10.6 Shopping

```http
GET    /shopping-lists
POST   /shopping-lists

GET    /shopping-lists/:id
PATCH  /shopping-lists/:id

POST   /shopping-lists/:id/items
PATCH  /shopping-lists/:id/items/:itemId
DELETE /shopping-lists/:id/items/:itemId
```

## 10.7 AI Assistant

```http
POST /ai/chat
```

## 10.8 API Standards

All endpoints must:

- Validate inputs.
- Enforce authentication when required.
- Verify resource ownership.
- Return consistent error responses.
- Avoid leaking internal errors.
- Support request tracing.
- Apply rate limiting where appropriate.

Example error response:

```json
{
  "error": {
    "code": "INVENTORY_ITEM_NOT_FOUND",
    "message": "Varan kunde inte hittas."
  }
}
```

Use idempotency protection for operations where duplicate requests could create incorrect inventory changes.

---

# 11. AI Architecture

## 11.1 AI Principles

AI is an assistant, not the source of truth.

The backend controls:

- Data access.
- Validation.
- Authorization.
- Business rules.
- Persistence.
- Tool execution.

AI controls:

- Suggestions.
- Language understanding.
- Image interpretation.
- Recipe generation.
- Contextual recommendations.

## 11.2 Food Recognition

### Input

- Image.
- Optional user context.
- Supported storage location.

### Output

Structured candidate products.

Example:

```json
{
  "items": [
    {
      "name": "Tomater",
      "quantity": 4,
      "unit": "pcs",
      "confidence": 0.91,
      "requiresReview": true
    }
  ]
}
```

Confidence is an AI-provided estimate, not a calibrated guarantee.

### Required Workflow

```text
Image uploaded
      |
      v
Validate file
      |
      v
AI recognition
      |
      v
Validate structured response
      |
      v
Show suggestions
      |
      v
User reviews
      |
      v
User confirms
      |
      v
Save inventory
```

Never infer exact expiry dates from appearance alone.

Never automatically write recognized items into inventory.

## 11.3 Recipe Generation

AI generation receives:

- Available ingredients.
- Quantities.
- Dietary restrictions.
- Allergies.
- Cooking preferences.
- Desired portions.
- Maximum cooking time.
- Optional user request.

### Required Output

```json
{
  "title": "Krämig tomatpasta",
  "description": "En enkel vardagspasta.",
  "servings": 2,
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 15,
  "ingredients": [
    {
      "name": "Pasta",
      "quantity": 200,
      "unit": "g"
    }
  ],
  "instructions": [
    "Koka pastan enligt anvisningarna."
  ]
}
```

The example only illustrates response structure, not a complete recipe.

### Validation

Before presenting a recipe:

1. Validate schema.
2. Check ingredient and quantity plausibility.
3. Apply allergy and dietary exclusion rules.
4. Verify required cooking information.
5. Calculate inventory availability deterministically.
6. Identify missing ingredients.

Do not rely on a prompt alone to enforce allergy safety.

When allergy compatibility cannot be verified, mark the recipe as unverified rather than claiming it is safe.

## 11.4 Recipe Matching

Use deterministic inventory matching combined with AI personalization.

Initial ranking hypothesis:

| Factor | Weight |
|---|---|
| Ingredient coverage | 40% |
| Expiry priority | 25% |
| Preference match | 20% |
| Cooking time | 10% |
| Variety | 5% |

Allergy and hard dietary restrictions must be applied before ranking.

Weights are configurable hypotheses and should be evaluated using real usage data.

## 11.5 Inventory Deduction

When a recipe is completed:

1. Determine expected ingredient usage.
2. Match ingredients to inventory batches.
3. Generate proposed deductions.
4. Display deductions to user.
5. Allow corrections.
6. Require confirmation.
7. Commit changes transactionally.
8. Record inventory events.

Prefer consuming earlier-expiring compatible batches first, while allowing user correction.

## 11.6 AI Assistant

The assistant may:

- Read authorized kitchen context.
- Suggest recipes.
- Explain substitutions.
- Prepare shopping-list changes.
- Recommend meal plans.

The assistant must not:

- Purchase groceries.
- Change allergies.
- Delete inventory without confirmation.
- Change household settings without authorization.
- Bypass backend validation.
- Claim certainty about food safety.

## 11.7 AI Cost Control

- Set per-user rate limits.
- Monitor token usage.
- Use appropriately sized models.
- Cache reusable results where safe.
- Avoid unnecessary repeated calls.
- Use deterministic logic for calculations.
- Add timeouts and retries with limits.
- Support graceful fallback.

---

# 12. Security and Privacy

## 12.1 Authentication

Use secure token-based authentication.

Never store service-role credentials or AI API keys in the mobile application.

## 12.2 Authorization

All household data must be protected.

A user must never access another household's:

- Inventory.
- Shopping lists.
- Meal plans.
- Preferences.
- AI interaction data.

Use backend authorization and appropriate database policies.

## 12.3 GDPR

Cena must support:

- Privacy policy.
- Terms of service.
- Data export.
- Account deletion.
- Data minimization.
- Appropriate retention periods.
- Clear AI data-processing disclosures.

## 12.4 Images

- Validate file type and size.
- Use secure uploads.
- Define retention rules.
- Avoid unnecessary permanent storage.
- Remove metadata when appropriate.
- Never expose private storage URLs publicly.

## 12.5 AI Security

- Treat model output as untrusted.
- Validate structured outputs.
- Prevent prompt-injection content from controlling tools.
- Never allow arbitrary model-generated database queries.
- Limit assistant tools to authorized operations.
- Require confirmation for consequential actions.

---

# 13. Subscription Model

## 13.1 Business Model

Freemium + subscription.

### Free

Proposed:

- Basic inventory.
- Manual product entry.
- Shopping list.
- Basic recipe discovery.
- Limited AI usage.

### Premium

Proposed:

- More generous AI usage.
- Image recognition.
- Personalized recipes.
- Advanced meal planning.
- Additional inventory intelligence.
- Expanded household features.

## 13.2 Initial Pricing Hypothesis

- Monthly: 59 SEK.
- Yearly: 499 SEK.

Pricing is not finalized.

Validate willingness to pay, retention and AI operating costs before locking subscription limits.

## 13.3 Payment Architecture

Use RevenueCat to coordinate mobile subscriptions.

Server-side premium entitlements must be validated before premium API operations.

Never trust only client-side subscription state.

---

# 14. Analytics and Success Metrics

## 14.1 North Star Candidate

Weekly users completing at least one meaningful kitchen action.

Meaningful actions include:

- Using a recipe.
- Planning a meal.
- Updating inventory.
- Creating a shopping list.

The exact North Star definition must be validated.

## 14.2 Initial KPI Hypotheses

| Metric | Initial hypothesis |
|---|---|
| Onboarding completion | 70% |
| First inventory activation | 65% |
| First recipe interaction | 60% |
| Weekly active users among activated users | 40% |
| 30-day retention | 25% |
| Free-to-paid conversion | 5% |
| Recipe satisfaction | 4/5 |

These are internal targets, not established market benchmarks.

## 14.3 Recommended Events

```text
onboarding_started
onboarding_completed

inventory_item_added
inventory_item_updated
inventory_item_removed

recognition_started
recognition_completed
recognition_corrected

recipe_viewed
recipe_generated
recipe_saved
recipe_cooked

shopping_item_added
shopping_item_purchased

meal_planned

subscription_viewed
subscription_started
subscription_cancelled
```

Avoid sending personal food preferences or sensitive information unnecessarily to analytics providers.

---

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

# 17. Accessibility

Target WCAG AA where applicable to the mobile experience.

Requirements:

- Screen reader support.
- Dynamic text sizing.
- Sufficient contrast.
- Accessible touch targets.
- Clear form labels.
- Error messages in text.
- Reduced-motion support.
- Logical focus order.
- No status conveyed by color alone.

Accessibility is part of the definition of done, not a final polish task.

---

# 18. Performance and Reliability

## Targets

- Fast initial navigation.
- Inventory loading under 2 seconds in typical conditions.
- Common non-AI API requests: target p95 below 500 ms.
- Recognition target under 15 seconds.
- Recipe generation target under 10 seconds.

Targets must be measured using realistic conditions.

## Reliability Requirements

- Handle network failures.
- Prevent duplicate mutations.
- Show retry actions.
- Avoid losing unsaved form input.
- Use safe transaction boundaries.
- Log errors without exposing private information.
- Keep AI failure from blocking manual inventory management.

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

# 21. AI Development Agent Instructions

This section defines how AI coding agents should work in the Cena repository.

## 21.1 Source of Truth

Before implementing a feature, read:

1. `CENA_BLUEPRINT.md`
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

# 23. Post-Launch Validation

After beta release, investigate:

- Do users continue updating inventory?
- Which input method is easiest?
- How accurate is inventory after one week?
- Are recipe suggestions actually useful?
- Do users cook suggested recipes?
- Do expiry reminders lead to action?
- Does meal planning improve retention?
- What are users willing to pay for?
- What does each active user cost to serve?

Prioritize future development using observed behavior rather than assumptions.

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
