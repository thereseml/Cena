# ADR-0005: AI service integration

**Status:** Accepted for recipe and other AI integrations; food photo recognition superseded by [ADR-0008](0008-food-recognition-provider.md)

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

Recipe model selection and recipe-specific evaluation remain deferred. Food photo recognition provider details are recorded in ADR-0008.

## References

- [Private beta scope](../mvp-scope.md)
- [Historical architecture](../architecture.md)
- [Original blueprint](../blueprint.md)
