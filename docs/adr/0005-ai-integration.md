# ADR-0005: AI service integration

**Status:** Accepted (product-owner architecture decision, 2026-11-08)

## Context
Photo recognition, personalized recipes and safe inventory mutations are P0. The blueprint requires AI outputs to be untrusted.

## Decision
- Integrate **OpenAI API through NestJS** (not directly from mobile).
- Use structured outputs validated by server schemas for multi-item photo recognition and personalized recipe generation.
- Treat AI results as proposals; only explicitly confirmed operations may change inventory.

## Consequences and guardrails
- Backend owns API keys, authorization, rate limits, timeouts and cost controls.
- Never infer expiry dates from food appearance or claim guaranteed allergy/food safety.
- Recognition may return several candidates; user reviews before persistence.
- Deterministic code handles stock matching and deductions; no autonomous AI writes.
- Keep manual entry available during AI outages.

## Deferred implementation details
Exact model selection, image upload/retention, structured response schemas, evaluation fixtures, quotas and fallback UI.

## References
- [Private beta scope](../mvp-scope.md)
- [Historical architecture](../architecture.md)
- [Original blueprint](../blueprint.md)
