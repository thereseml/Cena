# Receipt import

## Approved scope

PR12 now covers **receipt-only, on-device OCR**, replacing general product-image recognition by explicit product-owner approval on 2026-11-14. See [ADR-0009](adr/0009-receipt-import-ocr.md) and [MVP D02, D06 and J03](mvp-scope.md). Photograph a paper receipt or select a receipt image/screenshot, review proposed product rows, then explicitly confirm selected food items for the household inventory.

There is no cloud LLM, cloud OCR fallback, recognition upload or paid service in this flow. General grocery photographs, automatic supermarket integrations and price-accounting features are outside this scope. Other AI use cases are unaffected.

## Expo Go integration

The product owner explicitly requires Expo Go. [ADR-0010](adr/0010-expo-go-receipt-ocr.md) replaces ADR-0009's ML Kit/custom-build technical choice, not its receipt-only scope. OCR uses bundled Tesseract.js 7.0.0, Tesseract.js-core 7.0.0 and the Swedish `best_int` language model in a hidden local WebView. `react-native-webview@14.0.1` is included in Expo Go for SDK 58; `expo-asset@~58.0.21` loads the static resources. InfiniteRed dependencies and native patches are removed.

Five pinned runtime files total approximately 5.36 MiB. Code, worker, WASM and language data are bundled, with no runtime CDN or remote model fetch. After Metro delivers development assets, OCR inference is local and can run offline. This does not promise a fully offline Expo Go cold start, authentication or inventory saving.

Tesseract supplies text, line rectangles and optional raw 0–100 confidence scores. These scores are not calibrated probabilities or proof of product identity. Classification and review labels remain deterministic application decisions.

## Phone setup

Use the repository's Node/pnpm requirements and an Expo Go version compatible with SDK 58. No Xcode, CocoaPods, Android SDK, signing or custom native build is required for this receipt flow in Expo Go.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Keep phone and computer on the same LAN and scan the Metro QR code in Expo Go. To explicitly select Expo Go and clear stale Metro state after removing ML Kit, start the mobile server with this command instead of its normal `dev` command:

```bash
pnpm --filter @cena/mobile exec expo start --go --clear
```

When starting Metro separately, keep the API running with `pnpm --filter @cena/api dev`. Configure the existing `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` with the computer's reachable LAN address and `/api/v1`, not `localhost` on the phone. Check API reachability and local firewall settings if inventory operations fail. Use development configuration; never place server secrets in `EXPO_PUBLIC_*`.

Custom debug builds are optional, not an OCR prerequisite. Generated `apps/mobile/ios` and `apps/mobile/android` directories remain ignored. Web has no OCR and retains manual entry.

## Bundled asset maintenance

Runtime sources, model/license notices and hashes are recorded in [assets/ocr](../apps/mobile/assets/ocr/README.md). From the repository root, verify the existing resources without downloading or changing them:

```bash
node apps/mobile/assets/ocr/sync-assets.mjs
```

`--download` explicitly downloads and verifies pinned resources before replacing local files. It is maintenance only, not app startup or recognition behavior. Keep the manifest, bundled bytes and third-party/model notices synchronized; see the asset README for notice regeneration.

## Image handling

- The local helper handles JPEG, PNG, WebP and HEIC through conversion with the existing `expo-image-manipulator`. Real-device format behavior still requires verification.
- The local file-size cap is 20 MiB, with a 30-megapixel guard checked against both picker and decoded dimensions. File signatures, not only file names or declared MIME types, identify the supported formats before decoding.
- After decoding, cap OCR input at 8 MP with proportional downsampling only when needed; otherwise preserve resolution, including long receipts. Normalize to JPEG at quality 0.9. Do not reintroduce the old cloud-recognition 1,600 px longest-edge cap, which can destroy small receipt text. The pixel guard is not a measurement of phone memory or a guarantee against decode-time memory pressure.
- Conversion normalizes encoded orientation. Incorrectly oriented receipt content still needs manual rotation/retry or a clearer image; do not imply automatic text deskew or blur repair.
- Bound parser input to 100,000 text characters, 2,000 lines and 1,000 characters per line. Oversized or malformed text/geometry must fail safely rather than silently appearing to be a complete import.

## Parsing and review

The parser uses explicit Swedish normalization, price/quantity patterns and a finite food/non-food vocabulary. It uses line rectangles to reconstruct rows when available; structured lines take precedence over full text. Totals, payment details, discounts, deposits and other receipt metadata are not inventory products. Unrecognized content remains reviewable rather than being presented as verified food.

`FOOD`, `NON_FOOD` and `UNKNOWN` are heuristic categories. Unknown rows must not be silently confirmed as food, and non-food must not silently enter inventory. Users review names, selection, quantities, units and storage before confirmation. The parser is not a comprehensive Swedish product catalog.

An explicit receipt quantity such as `2 st x 19,90` can be proposed as quantity. A product label such as `MJÖLK 1L` or `PASTA 500G` does not establish the purchased amount. Missing quantities may be proposed as editable **1 st**, labelled as a proposal, not a confirmed OCR fact. Missing storage stays `null` and requires a choice; suggested storage can be changed. Expiry dates are never inferred from receipt dates or product names. No allergy or food-safety guarantee is made.

Parser fixtures are sanitized synthetic examples inspired by ICA, Coop, Willys, Hemköp and Lidl. They are not comprehensive real-format evidence, measured OCR accuracy or proof of support for every receipt from those chains.

## Privacy and persistence

Cena does not upload, log or persist raw receipt images or OCR text. Source text can contain payment, membership or other personal details and must not be included in diagnostics. OCR and review state remain in app memory until flow exit. Confirmed inventory fields alone go to the existing inventory API.

The private WebView disables cookies and WebView caching. A local blob worker receives bundled code, WASM and language bytes; CSP `connect-src 'none'` blocks network connections and there is no runtime CDN or network fallback. Code/model assets may be cached by Expo; receipt images/text are not cached as OCR assets. The former Google ML Kit telemetry disclosure no longer applies to this engine. This is not a claim that Metro, authentication, the inventory API or the entire app has no network activity.

Only feature-owned temporary conversion copies are deleted after OCR and on flow exit. Original user images are never deleted. Picker-created source caches are OS-managed; do not promise immediate deletion of every copy or secure erasure.

Recognition itself never writes inventory. Confirmation calls `POST /households/:householdId/inventory/bulk` under the configured API base path, with 1–30 selected items. Existing server validation and household membership checks apply. The whole submission is atomic and idempotent: a retry with the same submission key replays its result, not a second addition. New submissions are separate actions; idempotency does not detect repeated imports of the same receipt.

Imported entries create separate inventory items/batches and existing `ADDED` events. They do not silently merge quantities into similarly named stock. Prices and raw receipt content are not inventory persistence fields.

## Errors and recovery

Camera permission is requested when taking a photo. Denial or cancellation must leave inventory unchanged and keep gallery/manual entry available. Web or an unavailable OCR engine must offer manual entry and an honest explanation, not require a custom native build or attempt network recognition.

One hidden worker serves the active flow, with one recognition request at a time. Request/session IDs prevent stale responses from reaching review. Cancellation resets/unmounts the WebView and worker rather than just ignoring the result. The 120-second request timeout includes asset loading and worker initialization. Timeout, initialization failure or WebView process crash resets the engine so a new attempt can recover.

Unreadable, unsupported, oversized, empty or failed OCR input must show a safe Swedish error/empty state and allow a new image, manual rotation/retry where applicable, or manual entry. Do not expose raw native errors, receipt text or file paths in logs or UI. Never partially save candidates on an OCR/parser failure.

For a save/network failure, the result may be uncertain: the server may already have committed the submission. Retain and lock the original rows, payload, household and submission key for an identical retry. Offer a warned exit to check Mitt kök rather than silently creating a new submission after edits. Validation or authorization failure must produce no partial writes. Leaving the flow clears transient state and cleans up owned conversion copies; reopening must not resurrect an unconfirmed receipt.

## Verification status

Reported implementation evidence for the Expo Go replacement, not a claim that J03 passes:

| Check                                     | Status and boundary                                                                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expo Go prototype                         | Swedish short and 40-line receipt OCR ran in actual Expo Go 58.0.7 on an iPhone 17 Pro simulator. Not physical-device evidence.                                                                                                              |
| Production OCR chain                      | Actual image helper, engine, parser and review ran together with a synthetic PNG in Expo Go on iPhone 17 Pro simulator. Cancellation/retry passed; temporary JPEG removed and original retained. No inventory write or physical-camera test. |
| OCR on physical phones or Android         | Not verified.                                                                                                                                                                                                                                |
| Real retailer-format accuracy and latency | Not established; synthetic parser fixtures are not OCR evidence.                                                                                                                                                                             |
| Phone memory and offline cold start       | Not measured/verified. The 8 MP OCR cap does not establish peak memory usage.                                                                                                                                                                |
| Automated checks                          | `pnpm lint`, `pnpm typecheck`, `pnpm test` passed: 327 mobile tests and 62 API tests (API unchanged and cached). Contracts has no configured tests.                                                                                          |
| Exports and Storybook                     | `pnpm build`, Storybook story generation and web/Android/iOS Storybook exports passed. Bundled asset integrity/license-notice verification passed.                                                                                           |

The earlier unsigned custom-iOS compilation does not verify the new engine or phone setup. Bulk HTTP integration tests mock authentication and Prisma, including simulated rollback and concurrent unique conflicts; they do not prove real-database transactions. Do not claim J03 or beta readiness from simulator engine checks and mocked tests alone.

## Manual verification

Run the matrix in Expo Go on physical iOS and Android devices using safe, sanitized receipt images and development test households. Record device/OS/Expo Go version, image type, outcome and limitations without retaining personal receipt content. These are required checks, not completed results.

| Case                                                                | Expected result                                                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Camera photo and gallery screenshot                                 | Multiple readable food rows reach editable review; no inventory change before confirmation.                                          |
| JPEG, PNG, WebP and HEIC                                            | Supported local conversion/OCR or safe recoverable error; no source-image deletion.                                                  |
| Long, high-resolution receipt                                       | Proportional downsampling only above 8 MP; no 1,600 px cap or silent truncation. Check small-text quality and size/parser limits.    |
| Rotated receipt                                                     | User can correct orientation manually and retry; no claim of automatic correction.                                                   |
| Blur, glare, blank or unreadable image                              | Honest empty/error state, retry/manual option and zero writes.                                                                       |
| Unknown abbreviations and non-food rows                             | Clear distinction from food; no silent inclusion; corrections remain possible.                                                       |
| Package size, explicit quantity and missing quantity                | Package labels do not become purchased quantity; explicit quantity is reviewable; missing quantity is an editable labelled proposal. |
| Missing storage and expiry                                          | Storage must be chosen before save; no inferred expiry.                                                                              |
| Camera/gallery permission denial and picker cancellation            | Recoverable/manual path; no writes; retry works after permission is restored.                                                        |
| Flow exit, OCR failure and retry                                    | Owned conversions cleaned up, originals retained, transient state cleared on exit; no raw image/text logging, upload or persistence. |
| Cancel during asset load/initialization/OCR, timeout, WebView crash | Worker is actually reset/unmounted, stale results cannot enter review, a fresh attempt works and inventory remains unchanged.        |
| Network disabled after assets load                                  | Local OCR still reaches review without CDN/model requests; inventory saving may require network. Do not infer offline cold start.    |
| Confirm selected subset, 1–30 items                                 | Only confirmed rows persist atomically, with separate items and `ADDED` events; household members see the changes.                   |
| Save timeout/retry and double submission                            | Same submission key does not duplicate records; no partial saves.                                                                    |
| Invalid input, unauthenticated account and nonmember household      | Save rejected with zero writes, no cross-household access; review/recognition alone never writes.                                    |
| Expo Go on iOS/Android; web or unavailable engine                   | Expo Go runs local OCR without a custom build; web/unavailable engine gives an honest explanation and working manual path.           |
| Screen reader and enlarged text                                     | Review labels, errors, editable proposals and selection state are understandable and operable.                                       |
