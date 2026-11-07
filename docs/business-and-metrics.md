# Cena — Subscriptions, metrics and validation

> Extracted from [the original blueprint](blueprint.md), sections 13, 14, 23. Original section numbering retained. [Documentation index](README.md). Follow [AGENTS.md](../AGENTS.md).

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
