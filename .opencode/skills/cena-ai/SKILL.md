---
name: cena-ai
description: Implement Cena AI features including food photo recognition, structured outputs, recipe generation, provider integrations, validation, privacy and cost controls. Use whenever application functionality calls an AI model.
---

# Cena AI Integration

## Purpose

Build reliable, affordable and safe AI functionality without coupling Cena's domain logic to a specific AI provider.

## Required context

Read:

- `AGENTS.md`.
- Relevant AI sections of `docs/blueprint.md`.
- Accepted ADRs.
- Existing AI integrations.
- Existing contracts.
- Relevant domain services and tests.

Do not assume a provider or model is available without checking configuration.

## AI architecture

AI requests must go through the backend.

Keep provider-specific logic isolated.

Prefer a small provider interface when provider substitution is a realistic requirement.

Avoid building a large multi-provider framework prematurely.

Keep API keys server-side.

## Provider selection

Before introducing a model, evaluate:

- Required capabilities.
- Structured output support.
- Reliability.
- Latency.
- Cost.
- Rate limits.
- Privacy terms.
- Availability.

Use the simplest model that reliably satisfies the task.

Do not assume a model is free.

Do not activate paid services without approval.

Document the actual model identifier and provider.

## Structured outputs

Treat every AI response as untrusted input.

Requirements:

1. Request structured output where supported.
2. Parse the response safely.
3. Validate against an application schema.
4. Reject invalid or unsupported values.
5. Apply domain validation.
6. Return normalized application data.

Never write unvalidated AI output directly to the database.

## Food recognition

For image recognition:

- Support multiple visible products.
- Use Swedish food names.
- Avoid inventing quantities.
- Mark uncertain suggestions.
- Do not invent expiry dates.
- Do not infer food safety from appearance.
- Require user review before saving.

AI recognition produces suggestions, not authoritative inventory data.

## Recipe generation

For AI recipes:

- Use authorized household inventory data.
- Respect explicitly provided preferences and restrictions.
- Avoid unsupported claims about allergy safety.
- Validate structured recipe output.
- Distinguish available and missing ingredients.
- Do not automatically deduct inventory.
- Require confirmation before consequential changes.

## Privacy

Minimize information sent to external providers.

For image processing:

- Validate file types.
- Enforce size limits.
- Avoid unnecessary image retention.
- Avoid logging image contents.
- Document third-party processing.
- Follow applicable privacy requirements.

Never promise zero provider retention without verified contractual support.

## Cost controls

Implement appropriate:

- Request limits.
- Timeouts.
- Bounded retries.
- Image compression.
- Usage monitoring.
- Quota error handling.

Avoid uncontrolled retries or automatic fallback to paid models.

## Error handling

Handle:

- Provider unavailable.
- Timeout.
- Rate limiting.
- Invalid output.
- Empty results.
- Unsupported content.
- Quota exhaustion.

Return clear application-level errors.

Allow manual workflows when AI is unavailable.

## Testing

Use deterministic mocked provider responses.

Test:

- Valid responses.
- Invalid JSON.
- Missing fields.
- Unsupported values.
- Timeouts.
- Rate limits.
- Uncertain recognition.
- Empty recognition.
- No automatic database writes.

Run real provider tests only when suitable credentials and a safe environment are available.

## Final report

Include:

1. Provider and model used.
2. Feature behavior.
3. Validation approach.
4. Privacy considerations.
5. Cost controls.
6. Tests actually run.
7. Known limitations.

**Principle: AI suggests. Cena validates. The user confirms consequential changes.**