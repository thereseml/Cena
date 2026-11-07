# Cena — Domain entities, data rules and API contracts

> Extracted from [the original blueprint](blueprint.md), sections 9, 10. Original section numbering retained. [Documentation index](README.md). Follow [AGENTS.md](../AGENTS.md).

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
