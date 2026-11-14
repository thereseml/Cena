# Cena — MVP scope and beta acceptance criteria

**Status:** Approved product scope for private beta planning  
**Audience:** Product owner, Codex, OpenCode and implementation reviewers  
**Target:** 5–20 invited beta testers in Sweden; Swedish UI on iOS and Android  
**Related:** [Original blueprint](blueprint.md) · [Product specification](product.md) · [Documentation index](README.md)

## Authority and boundaries

This document records **new product-owner decisions** made after blueprint v2.0. For MVP scope and priorities, these nine decisions supersede conflicting P0/P1 descriptions in the preserved `docs/blueprint.md` and its extracted copies. For all other requirements, consult the blueprint and relevant topic documents. Do **not** edit the historical blueprint to reconcile differences. Architectural and UX implementation details remain subject to later decisions.

**Beta success hypothesis:** A tester can register, add food with minimal effort, discover a relevant recipe, cook, confirm inventory changes, and use a shared shopping list without losing trust in inventory accuracy.

## Nine confirmed MVP decisions

| ID | Topic | Approved decision | Scope implication |
| --- | --- | --- | --- |
| D01 | Release | Private beta with 5–20 testers | Beta access and feedback, not public monetized launch |
| D02 | Inventory entry | Manual entry **and** on-device receipt OCR import | Both P0; replaces general product-image recognition in PR12 |
| D03 | Recipes | Personalized, AI-generated recipes | P0; respect inventory and preferences |
| D04 | Planning | Weekly meal planning is P1 | Not required for beta |
| D05 | Household | Multiple users share a household | Household sharing promoted from P1 to P0 |
| D06 | Receipt input | Extract multiple product rows from a receipt photo or screenshot using local OCR and deterministic Swedish parsing | Review/edit/select before saving; no cloud LLM or paid recognition service |
| D07 | Invitations | Invite by link **or** email | Both are acceptable invitation methods; exact implementation TBD |
| D08 | Expiry | Optional expiry dates and simple overview | No mandatory date, no push reminders |
| D09 | Shopping | Check off purchases and offer to add them to inventory | Inventory additions require explicit confirmation |

**Approved revision, 2026-11-14:** The product owner explicitly replaced PR12 general product-image recognition with OCR-only receipt import. D02, D06 and J03 now describe this replacement, not an additional recognition mode. Basic receipt OCR moves from historical P2 to P0; general grocery-photo recognition is outside this beta scope. No cloud LLM, cloud OCR fallback or paid service is authorized for receipt import. See [ADR-0009](adr/0009-receipt-import-ocr.md) and the [receipt import guide](receipt-import.md). Other AI use cases are unchanged by this decision.

## P0 — required for private beta

### Account, onboarding and household

- Sign up, sign in, sign out and recover account access.
- Create or join a household; capture household size, dietary preferences, allergies/restrictions and disliked ingredients.
- Invite another account to the same household via a link or email-based invitation; invited members can access the household's shared inventory and shopping list.
- Enforce membership authorization on every household resource. Nonmembers cannot read or change data.
- Provide a way to leave an invitation unaccepted; avoid granting access until invitation acceptance.

### Kitchen inventory

- Add, edit, remove, search and filter ingredients manually; record quantity, unit and storage location (fridge/freezer/pantry).
- Take/select **one receipt photo or screenshot**; run bundled on-device OCR and deterministic Swedish parsing, show candidate rows, allow correction/removal/addition/selection, and save only after explicit confirmation.
- Distinguish food, non-food and unknown rows. Unknown content must not be treated as confirmed food. Package size in a product name is not evidence of purchased quantity. A missing quantity may be proposed as editable `1 st`, clearly labelled as a proposal; a missing storage location requires a choice.
- Do not invent product identities, quantities, expiry dates or food-safety assurances. Uncertain fields must be reviewable or left blank.
- Expiry date is optional. Show an understandable overview of items with dates approaching/passed; items without dates remain usable.
- Shared household members see confirmed changes consistently.

### Personalized recipes and cooking

- Generate and browse recipes informed by household inventory, portions, dietary preferences, restrictions and disliked ingredients.
- Show available vs missing ingredients, ingredient quantities, instructions and cooking time; allow time/preference filtering and favorites.
- Present AI suggestions as suggestions, not guaranteed allergy-safe or factually verified. Surface uncertainty and do not imply medical/food-safety guarantees.
- Mark a recipe as cooked, review proposed deductions, edit/skip deductions as needed and confirm before modifying shared inventory.
- Never silently subtract inventory because a recipe was viewed, generated or selected.

### Shopping list

- Add/edit/remove shopping items and add missing recipe ingredients.
- Shared household members can view and check off items.
- After checking off a purchased item, offer to add it to household inventory; allow reviewing quantity/unit/location and explicitly confirming.
- Do not automatically transfer every checked item into inventory.

### Beta readiness

- Core flows have usable loading, empty, error and recovery states; Swedish copy and basic accessibility.
- Persist data across app restarts; maintain household isolation and secure AI/API handling.
- Instrument basic feedback/error reporting and monitor AI usage/cost. Provide an agreed way to invite 5–20 testers.
- Verify the end-to-end journey on intended iOS and Android beta builds before inviting testers.

## P1 — explicitly outside the beta gate

- Weekly meal planning and generated weekly menus.
- Rich personalized Home dashboard and contextual conversational assistant.
- Push expiry reminders, richer onboarding and recipe feedback.
- Advanced household convenience beyond the basic shared inventory and shopping list.

The five-tab navigation in the original UX blueprint is a design target; the **Plan** destination must not imply working weekly planning in P0. Choose an honest disabled/coming-later or simplified navigation treatment during UX planning.

## P2 — future exploration, not part of beta

Barcode/supermarket integrations, price comparisons, automatic replenishment, advanced nutrition, consumption prediction, voice, advanced household roles/permissions, and sophisticated meal-planning automation. Basic receipt OCR is now P0 by the explicit revision above; automatic retailer integrations and price-accounting features are not included. No automatic purchases.

## Primary user journeys and testable acceptance criteria

### J01 — First household and invitation

1. User A creates an account, sets preferences and creates a household.
2. A invites user B through a link or email.
3. B accepts and joins the household.
4. Both see the same inventory and shopping list.

**Pass when:** An accepted member can read and update shared data; an uninvited/nonmember account cannot access it; the invitation alone does not grant access before acceptance.

### J02 — Manual inventory

1. A adds “Mjölk”, 1 liter, refrigerator, without expiry date.
2. A closes and reopens the app; B opens the shared kitchen.
3. A edits quantity and optionally adds an expiry date.

**Pass when:** The entry persists, appears for both members, can be edited/deleted, and missing expiry is valid.

### J03 — On-device receipt import

1. A takes/selects a receipt photo or screenshot containing at least two food product rows.
2. Cena performs OCR on device and proposes rows using deterministic parsing, distinguishing food, non-food, unknown and unrecognized content.
3. A corrects a candidate, excludes an incorrect/non-food row, reviews proposed quantities and chooses any missing storage location.
4. A explicitly confirms between 1 and 30 selected items for the shared household.

**Pass when:** No image or raw OCR text is uploaded, logged or persisted by Cena; no inventory write occurs on selection, OCR, review, failure or cancellation. Only confirmed items are saved atomically through the existing authorized, idempotent bulk API. A retry does not duplicate that submission. Items are created separately, not silently merged with existing quantities. Missing quantities are labelled editable proposals, missing storage requires a choice, and no expiry or food-safety guarantee is inferred. Permission denial, failed/empty OCR and unsupported platforms offer retry where possible and manual entry. Complete the [manual verification matrix](receipt-import.md#manual-verification) on iOS and Android before claiming J03 passes; synthetic parser fixtures alone do not establish real receipt accuracy.

### J04 — Personalized recipe

1. A requests dinner ideas using current inventory and dietary preferences.
2. Cena displays a generated recipe, missing ingredients, portions and instructions.
3. A saves a favorite or adds missing ingredients to the shopping list.

**Pass when:** The recipe displays inventory matches/missing items; dietary restrictions are passed as constraints and any uncertainty is communicated; the user can proceed without changing inventory.

### J05 — Cook and confirm deduction

1. A selects a recipe and portions, then marks it cooked.
2. Cena proposes ingredient deductions from available stock.
3. A adjusts/declines a proposed deduction and confirms the remainder.

**Pass when:** No inventory change happens before confirmation; confirmed changes are reflected for B; unavailable or ambiguous ingredients are not silently deducted.

### J06 — Shared shopping and restocking

1. A adds a missing recipe ingredient to the shared shopping list.
2. B checks it off after purchase.
3. Cena offers inventory addition; B reviews and confirms.

**Pass when:** Both see the checked state; checking off alone does not create inventory; confirmed addition appears once in shared inventory.

### J07 — Expiry overview

1. A saves one item with a date and another without.
2. A opens the expiry overview.

**Pass when:** Dated items can be prioritized by their dates, undated items are not assigned inferred dates, and no push notification is required.

## Beta exit / validation gate

- All J01–J07 pass on test accounts, including two accounts in one household and a nonmember isolation test.
- No unconfirmed AI output or cooking/shopping action mutates inventory.
- Critical account, authorization and data-loss defects are resolved before external testers.
- Invite 5–20 people, collect qualitative feedback on setup effort, recipe usefulness, inventory trust and repeated usage.
- **Do not claim product-market fit** from a small private beta. Numeric retention/conversion thresholds are not yet approved.

## Open, non-blocking decisions

These must be settled in the relevant design/architecture/issues work **before implementing their affected flow**, but they do not block approval of this MVP scope.

| Question | Owner / next step |
| --- | --- |
| Invite transport, link lifetime, expiry, revocation and abuse controls | Architecture/security ADR |
| Household membership roles, ownership transfer and simultaneous-edit conflicts | Architecture/domain ADR; start with minimal safe permissions |
| Receipt formats, image limits and recovery behavior | ADR-0009 and receipt import guide; real-device verification remains required; wrapper has no OCR confidence scores |
| Ingredient taxonomy, quantities/units and recipe matching semantics | Domain/API specification |
| How to represent best-before vs use-by and which dates appear as “soon” | Product + food-safety UX decision |
| Beta distribution, consent, feedback channel and privacy notices | Release checklist |
| Whether subscription/paywall is absent or hidden in private beta | Product/commercial decision |
| How to represent Home and Plan tabs without shipping P1 functionality | UX decision |
| Beta success measures and observation window | Product validation plan |

## Change control

Do not silently promote P1/P2 features into P0. New decisions require product-owner approval and an update to this document (or a linked decision record). Implementation tickets must cite the relevant journey and acceptance criteria. No architecture or implementation is approved merely by listing it here.
