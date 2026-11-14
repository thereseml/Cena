# ADR-0008: Food photo recognition provider

**Status:** Accepted (product-owner decision, 2026-11-14)

## Context

The private beta requires multi-item food photo recognition for Swedish users. Google Gemini's unpaid API tier is not permitted for an application offered to end users in the EEA under its current Additional Terms. Enabling Google billing was not approved. OpenRouter's free model routing does not provide a single stable provider/data-processing boundary suitable for this flow.

## Decision

- Use Cloudflare Workers AI through the authenticated NestJS API for food photo recognition.
- Initial model: `@cf/qwen/qwen3.8-27b`.
- Do not call the model directly from the mobile app. Keep the Cloudflare account ID and API token server-side.
- Use Workers AI's free allocation only. Do not enable Workers Paid or configure automatic paid usage. Requests that exceed the free allocation must fail rather than switch providers or incur charges.
- Treat all model output as untrusted, validate it in the API, and require explicit user confirmation before inventory writes.
- Do not retain images. Send only the resized image and a minimal recognition instruction; do not send household or user profile data.

## Consequences and guardrails

- Workers AI documents a shared free allocation of 10,000 Neurons per account per UTC day. Requests exceeding the daily allocation fail on Workers Free. The allowance is shared across the account and can change; it is not a per-user quota or availability guarantee. The current model page lists $0.45 per million input tokens, $3.20 per million output tokens and $0.05 per million cached input tokens; Workers Paid overage is priced at $0.011 per 1,000 Neurons. Those paid rates are documented for transparency only and are not approved for this beta.
- Cloudflare documents zero retention for standard stateless inference and no use of Workers AI Customer Content to train models. Operational metadata may be retained, and legal/safety exceptions apply. Processing is not guaranteed to stay in the EU; the Cloudflare DPA describes international transfer safeguards.
- The selected Qwen model supports vision. Its Swedish food-recognition quality and structured-output behavior must be verified with safe test images before beta release. Server-side schemas remain authoritative even when the model supports JSON schema output.
- Keep local inventory entry available when provider credentials, network access, or free quota are unavailable.
- No automatic provider fallback, retry loop, image persistence, expiry extraction, or direct AI inventory mutation.
- This decision supersedes ADR-0005 only for food photo recognition. Other AI use cases remain subject to their own approved decisions.

## References

- [Workers AI pricing and free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Qwen model capabilities](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/)
- [Workers AI data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/)
- [Cloudflare Data Processing Addendum](https://www.cloudflare.com/cloudflare-customer-dpa/)
- [ADR-0005: AI service integration](0005-ai-integration.md)
- [Private beta scope](../mvp-scope.md)
