# Cena — Warm Minimalism tokens and component rules

> Extracted from [the original blueprint](blueprint.md), sections 6. Original section numbering retained. [Documentation index](README.md). Follow [AGENTS.md](../AGENTS.md).

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
