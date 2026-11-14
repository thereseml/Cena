# ADR-0005: AI service integration

**Status:** Accepted for recipe and other AI integrations; inventory photo input was superseded by ADR-0008 and is now replaced by receipt-only OCR in [ADR-0009](0009-receipt-import-ocr.md)

## Context

Photo recognition, personalized recipes and safe inventory mutations are P0. The blueprint requires AI outputs to be untrusted.

## Decision

- Integrate **OpenAI API through NestJS** (not directly from mobile) for use cases not covered by a more specific accepted ADR.
- Use structured outputs validated by server schemas for AI-generated content.
- Treat AI results as proposals; only explicitly confirmed operations may change inventory.

## Consequences and guardrails

- Backend owns API keys, authorization, rate limits, timeouts and cost controls.
- Never infer expiry dates from food appearance or claim guaranteed allergy/food safety.
- Recognition may return several candidates; user reviews before persistence.
- Deterministic code handles stock matching and deductions; no autonomous AI writes.
- Keep manual entry available during AI outages.

## Deferred implementation details

Recipe model selection and recipe-specific evaluation remain deferred. ADR-0008 preserves the abandoned food photo provider decision; ADR-0009 governs the current receipt-only inventory import.

## References

- [Private beta scope](../mvp-scope.md)
- [Historical architecture](../architecture.md)
- [Original blueprint](../blueprint.md)
