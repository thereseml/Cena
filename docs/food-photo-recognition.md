# Food photo recognition

## Provider and cost boundary

Food photo recognition uses Cloudflare Workers AI through the NestJS API. The initial model is `@cf/qwen/qwen3.8-27b`; provider-specific request/response fields are isolated in the API adapter. The mobile bundle must never contain Cloudflare credentials.

Cloudflare currently documents a shared Workers AI free allocation of **10,000 Neurons per account per UTC day**. The selected model is not listed among models requiring a paid plan. On Workers Free, usage above the free allocation is rejected; on Workers Paid, usage above the allocation is billable. Keep the Cloudflare account on Workers Free for this beta and do not enable Workers Paid or prepaid AI Gateway credits. The free pool is shared across all Workers AI activity on the account, is not guaranteed capacity, and can change. The model page currently lists $0.45 per million input tokens, $3.20 per million output tokens and $0.05 per million cached input tokens; Workers Paid overage is $0.011 per 1,000 Neurons. These rates are recorded for transparency, not approval to incur charges. The API allows up to 60 seconds for one inference and limits each authenticated user to 10 recognition requests per 24 hours in each API process. The application limit is in-memory and resets when the API process restarts; it does not replace Cloudflare's account-wide quota.

No automatic provider fallback or retry is configured. Provider quota/rate failures are returned to the user as recoverable errors. Manual inventory entry remains available.

## Provider setup

1. Create or use a Cloudflare account and keep the Workers plan on Free.
2. Enable Workers AI and create an account-scoped API token with only the permissions needed to run Workers AI inference.
3. Configure these server-only variables in `apps/api/.env` or the deployment secret store:

```dotenv
FOOD_RECOGNITION_PROVIDER=cloudflare
FOOD_RECOGNITION_MODEL=@cf/qwen/qwen3.8-27b
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-workers-ai-token
FOOD_RECOGNITION_TIMEOUT_MS=60000
FOOD_RECOGNITION_MAX_IMAGE_BYTES=5242880
```

Never set `CLOUDFLARE_API_TOKEN` in an `EXPO_PUBLIC_*` variable. Keep the account on Workers Free so over-quota requests fail rather than become billable.

## Image and privacy handling

The mobile app requests camera permission only after the user taps **Ta foto**. Gallery selection uses the platform picker. Selected images are resized and re-encoded as JPEG at a maximum 1,600 px dimension; oversized output gets one smaller compression attempt. The API limits upload size to 5 MiB, checks image content and dimensions rather than trusting the supplied MIME header, and keeps the upload in memory. The image is not added to Cena storage or inventory. It is sent to Cloudflare only after the user starts analysis.

The app discloses that Cloudflare Workers AI processes the photo. Cloudflare documents zero retention for standard stateless inference and says Workers AI content is not used to train models. Its documentation also allows limited legal/safety exceptions and retention of operational metadata. Processing is global and is not guaranteed to remain within the EU. Review the current [Workers AI data usage policy](https://developers.cloudflare.com/workers-ai/platform/data-usage/), [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) and applicable agreement before inviting beta users; this document is not a legal assessment.

## Recognition behavior and limitations

- The API accepts JPEG, PNG and WebP, up to 5 MiB and 20 megapixels.
- Only visible food is requested. Household profile, inventory, user ID and expiry preferences are not sent to the model.
- Quantities and units may be absent. Expiry dates are never extracted or inferred in this feature.
- Every result is marked for review. The API validates names, quantities, units, descriptions and confidence labels, and removes exact duplicate suggestions.
- Model confidence is an uncalibrated estimate, not a guarantee. Users must review every suggestion.
- Cloudflare documents vision and structured-output capabilities for the selected model. Its Swedish food-recognition accuracy has not been manually evaluated yet; do not claim accuracy until the safe-image evaluation set has been run.
- Cloudflare's free allowance and model/API behavior can change. Keep manual entry functional and monitor the account's Neuron consumption.

## Manual provider smoke test

On 2026-11-14, the configured Cloudflare provider was called once with a synthetic blank 1×1 PNG. The API call succeeded and normalized to an empty item list, as expected for a non-food image. This verifies the current credentials, Chat Completions endpoint and response parser only; it does not establish Swedish grocery-recognition quality. No personal photo was sent.

## Persistence

Recognition never writes inventory. The user edits/removes/adds candidates and confirms with **Lägg till i mitt kök**. The API validates all selected inputs and writes the whole batch, batches and inventory events in one Prisma transaction. A request idempotency key makes a safe retry replay the same result rather than adding duplicate records. Household membership is checked by the existing inventory domain.
