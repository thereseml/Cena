# ADR-0009: On-device receipt import OCR

**Status:** Accepted (explicit product-owner decision, 2026-11-14)
**Supersedes:** [ADR-0008](0008-food-recognition-provider.md)

## Context

The product owner explicitly replaces PR12 general product-image recognition with receipt-only OCR import. This changes approved MVP decisions D02, D06 and journey J03. It is not permission to add another recognition mode or to introduce a cloud LLM, cloud OCR fallback or paid service. The historical blueprint remains unchanged.

## Decision

- Use bundled Google ML Kit Latin text recognition on iOS and Android, locally on the device, through `@infinitered/react-native-mlkit-text-recognition@5.0.1` and `@infinitered/react-native-mlkit-core@3.1.0`.
- Keep the pnpm lockfile and versioned patches authoritative. Patches migrate Android Expo Gradle integration, resolve the Swift `Text` naming collision, and remove sensitive native logging/error details.
- Parse Swedish receipt rows deterministically with explicit normalization and food/non-food/unknown classification. No model-based product interpretation or network recognition is used.
- Treat OCR and parser output as untrusted proposals. The wrapper exposes text, lines, rectangles and languages, not confidence scores; do not fabricate confidence values or imply verified product identity.
- Require review and explicit selection/confirmation before calling the existing household inventory bulk endpoint. Preserve server validation, membership checks, atomic writes and idempotency.
- Keep manual entry available, including on web, in Expo Go and when OCR, permissions or native integration are unavailable. Do not install a cloud fallback.

## Data and safety boundaries

- No raw receipt image or OCR text is uploaded, logged or persisted by Cena. Recognition/review data remains in app memory until flow exit; confirmed inventory fields are sent to the inventory API.
- Delete only feature-owned temporary conversion copies after OCR and on flow exit. Never delete the user's originals. Platform picker caches are OS-managed; this is not a promise that all source copies are erased.
- Package sizes in product labels are not purchased quantities. Missing quantity can be proposed as editable `1 st`, explicitly labelled as a proposal. Missing storage remains `null` and requires a user choice; storage suggestions are editable.
- Never infer expiry dates or claim food/allergy safety. Do not silently merge imported quantities into existing inventory items. Use separate items and existing `ADDED` inventory-event semantics.
- Limit a confirmed submission to 1–30 selected items. Bound OCR/parser input; retain source resolution for long receipts rather than applying the obsolete 1,600 px recognition limit.

## Consequences and verification gates

- This native module requires a custom native build; Expo Go and web cannot run OCR. Local builds are sufficient; EAS or another paid build service is not required. `expo-dev-client` is not currently installed.
- Expo SDK 58 / React Native 0.88.1 has a reported successful unsigned generic-iOS `xcodebuild` using Xcode 26.4.1. This establishes compilation only, not signed installation or OCR behavior.
- Android native build verification is blocked by the missing Android SDK. Real-device OCR has not been tested on either platform.
- Sanitized synthetic fixtures inspired by ICA, Coop, Willys, Hemköp and Lidl exercise parser behavior, not comprehensive real retailer-format support or measured OCR accuracy.
- Complete native/device, privacy, recovery and authorization checks in the [receipt import guide](../receipt-import.md) before claiming beta readiness. Automated image guards limit local files to 20 MiB and 30 megapixels, checked against picker and decoded dimensions; these tests do not replace device verification.

## Scope of supersession

ADR-0008 is historical and no longer authorizes Cloudflare recognition. ADR-0005 remains applicable to recipes and other separately approved AI use cases, not receipt import. Removal of the obsolete `food-photo-recognition.md` guide and its local changes was explicitly approved by the product owner.

## References

- [Approved MVP scope, D02/D06/J03](../mvp-scope.md)
- [Receipt import implementation and verification guide](../receipt-import.md)
- [ADR-0001: Mobile platform and monorepo](0001-mobile-and-monorepo.md)
- [ADR-0005: AI service integration](0005-ai-integration.md)
