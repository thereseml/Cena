# Receipt import

## Approved scope

PR12 now covers **receipt-only, on-device OCR**, replacing general product-image recognition by explicit product-owner approval on 2026-11-14. See [ADR-0009](adr/0009-receipt-import-ocr.md) and [MVP D02, D06 and J03](mvp-scope.md). Photograph a paper receipt or select a receipt image/screenshot, review proposed product rows, then explicitly confirm selected food items for the household inventory.

There is no cloud LLM, cloud OCR fallback, recognition upload or paid service in this flow. General grocery photographs, automatic supermarket integrations and price-accounting features are outside this scope. Other AI use cases are unaffected.

## Native integration

The pinned wrapper is `@infinitered/react-native-mlkit-text-recognition@5.0.1` with `@infinitered/react-native-mlkit-core@3.1.0`. Both platforms use bundled Google ML Kit Latin text recognition. OCR does not require an inference service or a model download at recognition time.

Versioned pnpm patches in `patches/`, referenced by `pnpm-workspace.yaml` and the lockfile, update Android Expo Gradle integration, fix the Swift `Text` collision and remove sensitive native logs/error details. Keep patches and lockfile together when changing these packages; do not bypass them with an unpatched installation.

The wrapper supplies text, lines, rectangles and language information. It does **not** expose OCR confidence scores. Classification and review labels are deterministic application decisions, not calibrated confidence or proof that text is correct.

## Local build setup

Use the repository's Node/pnpm requirements. Native compilation additionally requires Xcode/CocoaPods for iOS, or a compatible JDK and installed/configured Android SDK for Android. The iOS bundle identifier and Android package are both `se.cena.app`. Generated `apps/mobile/ios` and `apps/mobile/android` directories are ignored; native configuration and dependency patches must remain reproducible from tracked files.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @cena/mobile exec expo prebuild --no-install
```

For iOS, run `pod install` in `apps/mobile/ios` after prebuild. Then, from the repository root, build/install the desired platform:

```bash
pnpm --filter @cena/mobile exec expo run:ios --device
pnpm --filter @cena/mobile exec expo run:android --device
```

These are alternatives, not a requirement to build both on a host without their toolchains. Physical iOS installation requires appropriate signing; an unsigned generic-iOS build is not installable device evidence. Rebuild after native dependency or patch changes.

To start Metro for the custom native app:

```bash
pnpm --filter @cena/mobile exec expo start --dev-client
```

`expo-dev-client` is **not currently installed**. The command selects custom-native-client serving; it does not install the package or add its launcher/developer-menu functionality. Use the locally built debug application, not Expo Go. Local builds need no EAS account or paid build service. Web has no OCR and must retain manual entry.

## Image handling

- The local helper handles JPEG, PNG, WebP and HEIC through conversion with the existing `expo-image-manipulator` where needed for native OCR. Real-device format behavior still requires verification.
- The local file-size cap is 20 MiB, with a 30-megapixel guard checked against both picker and decoded dimensions. File signatures, not only file names or declared MIME types, identify the supported formats before decoding.
- Preserve resolution, including long receipts. Do not reintroduce the old cloud-recognition 1,600 px dimension cap, which can destroy small receipt text.
- Rotation is manual. Ask the user to correct orientation or capture a clearer image; do not imply automatic rotation/deskew or blur repair.
- Bound parser input to 100,000 text characters, 2,000 lines and 1,000 characters per line. Oversized or malformed text/geometry must fail safely rather than silently appearing to be a complete import.

## Parsing and review

The parser uses explicit Swedish normalization, price/quantity patterns and a finite food/non-food vocabulary. It uses line rectangles to reconstruct rows when available; structured lines take precedence over full text. Totals, payment details, discounts, deposits and other receipt metadata are not inventory products. Unrecognized content remains reviewable rather than being presented as verified food.

`FOOD`, `NON_FOOD` and `UNKNOWN` are heuristic categories. Unknown rows must not be silently confirmed as food, and non-food must not silently enter inventory. Users review names, selection, quantities, units and storage before confirmation. The parser is not a comprehensive Swedish product catalog.

An explicit receipt quantity such as `2 st x 19,90` can be proposed as quantity. A product label such as `MJÖLK 1L` or `PASTA 500G` does not establish the purchased amount. Missing quantities may be proposed as editable **1 st**, labelled as a proposal, not a confirmed OCR fact. Missing storage stays `null` and requires a choice; suggested storage can be changed. Expiry dates are never inferred from receipt dates or product names. No allergy or food-safety guarantee is made.

Parser fixtures are sanitized synthetic examples inspired by ICA, Coop, Willys, Hemköp and Lidl. They are not comprehensive real-format evidence, measured OCR accuracy or proof of support for every receipt from those chains.

## Privacy and persistence

Cena does not upload, log or persist raw receipt images or OCR text. Source text can contain payment, membership or other personal details and must not be included in diagnostics. OCR and review state remain in app memory until flow exit. Confirmed inventory fields alone go to the existing inventory API.

On-device processing is not a promise of zero SDK network activity. Google's [ML Kit terms and privacy notice](https://developers.google.com/ml-kit/terms) state that input images/text and recognized output stay on device, while the SDK may send performance/utilization metrics and contact Google for updates or compatibility information. The capture UI discloses these technical metrics. Review Google's linked App Store/Google Play disclosure guidance before beta distribution; no cloud receipt-processing fallback is configured.

Only feature-owned temporary conversion copies are deleted after OCR and on flow exit. Original user images are never deleted. Picker-created source caches are OS-managed; do not promise immediate deletion of every copy or secure erasure.

Recognition itself never writes inventory. Confirmation calls `POST /households/:householdId/inventory/bulk` under the configured API base path, with 1–30 selected items. Existing server validation and household membership checks apply. The whole submission is atomic and idempotent: a retry with the same submission key replays its result, not a second addition. New submissions are separate actions; idempotency does not detect repeated imports of the same receipt.

Imported entries create separate inventory items/batches and existing `ADDED` events. They do not silently merge quantities into similarly named stock. Prices and raw receipt content are not inventory persistence fields.

## Errors and recovery

Camera permission is requested when taking a photo. Denial or cancellation must leave inventory unchanged and keep gallery/manual entry available. Unsupported platforms or missing native modules must explain that a custom native build is needed and offer manual entry, not attempt network recognition.

Unreadable, unsupported, oversized, empty or failed OCR input must show a safe Swedish error/empty state and allow a new image, manual rotation/retry where applicable, or manual entry. Do not expose raw native errors, receipt text or file paths in logs or UI. Never partially save candidates on an OCR/parser failure.

For a save/network failure, the result may be uncertain: the server may already have committed the submission. Retain and lock the original rows, payload, household and submission key for an identical retry. Offer a warned exit to check Mitt kök rather than silently creating a new submission after edits. Validation or authorization failure must produce no partial writes. Leaving the flow clears transient state and cleans up owned conversion copies; reopening must not resurrect an unconfirmed receipt.

## Verification status

Implementation verification results:

| Check                                     | Status and boundary                                                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native iOS compilation                    | Passed: unsigned generic-iOS `xcodebuild`, Expo SDK 58 / React Native 0.88.1, Xcode 26.4.1. Not device installation or OCR validation.                      |
| Native Android build                      | Blocked: Android SDK missing.                                                                                                                               |
| OCR on physical iOS/Android devices       | Not run.                                                                                                                                                    |
| Real retailer-format accuracy and latency | Not established; synthetic parser fixtures are not OCR evidence.                                                                                            |
| Automated checks                          | `pnpm lint`, `pnpm typecheck`, `pnpm test` passed: API 62 tests; mobile 260 tests. Contracts has no configured tests.                                       |
| Image/OCR adapter                         | 21 mocked tests passed, including file signatures, size/dimensions, malformed output, cleanup, errors and native concurrency. Not real-device OCR evidence. |
| Application bundles                       | `pnpm build` passed, including Expo web, Android and iOS exports.                                                                                           |
| Storybook                                 | Story generation and web/Android/iOS Storybook exports passed; component story states rendered in tests. Visual on-device review not run.                   |

Bulk HTTP integration tests mock authentication and Prisma, including simulated rollback and concurrent unique conflicts; they do not prove real-database transactions. Do not claim J03 or beta readiness from native compilation and mocked tests alone.

## Manual verification

Run the matrix on custom iOS and Android builds using safe, sanitized receipt images and development test households. Record device/OS, image type, outcome and limitations without retaining personal receipt content. These are required checks, not completed results.

| Case                                                           | Expected result                                                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Camera photo and gallery screenshot                            | Multiple readable food rows reach editable review; no inventory change before confirmation.                                          |
| JPEG, PNG, WebP and HEIC                                       | Supported local conversion/OCR or safe recoverable error; no source-image deletion.                                                  |
| Long, high-resolution receipt                                  | Small text remains legible; no 1,600 px downscale or silent truncation. Exercise size/parser limits separately.                      |
| Rotated receipt                                                | User can correct orientation manually and retry; no claim of automatic correction.                                                   |
| Blur, glare, blank or unreadable image                         | Honest empty/error state, retry/manual option and zero writes.                                                                       |
| Unknown abbreviations and non-food rows                        | Clear distinction from food; no silent inclusion; corrections remain possible.                                                       |
| Package size, explicit quantity and missing quantity           | Package labels do not become purchased quantity; explicit quantity is reviewable; missing quantity is an editable labelled proposal. |
| Missing storage and expiry                                     | Storage must be chosen before save; no inferred expiry.                                                                              |
| Camera/gallery permission denial and picker cancellation       | Recoverable/manual path; no writes; retry works after permission is restored.                                                        |
| Flow exit, OCR failure and retry                               | Owned conversions cleaned up, originals retained, transient state cleared on exit; no raw image/text logging, upload or persistence. |
| Confirm selected subset, 1–30 items                            | Only confirmed rows persist atomically, with separate items and `ADDED` events; household members see the changes.                   |
| Save timeout/retry and double submission                       | Same submission key does not duplicate records; no partial saves.                                                                    |
| Invalid input, unauthenticated account and nonmember household | Save rejected with zero writes, no cross-household access; review/recognition alone never writes.                                    |
| Web, Expo Go and missing native module                         | OCR unavailable with an honest explanation and working manual path.                                                                  |
| Screen reader and enlarged text                                | Review labels, errors, editable proposals and selection state are understandable and operable.                                       |
