# Cena — AI workflows, validation, privacy and security

> Extracted from [the original blueprint](blueprint.md), sections 11, 12. Original section numbering retained. [Documentation index](README.md). Follow [AGENTS.md](../AGENTS.md).

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
