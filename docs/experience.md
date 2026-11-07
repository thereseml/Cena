# Cena — Navigation, journeys, screen requirements and accessibility

> Extracted from [the original blueprint](blueprint.md), sections 5, 7, 17. Original section numbering retained. [Documentation index](README.md). Follow [AGENTS.md](../AGENTS.md).

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
