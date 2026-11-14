# ADR-0010: Expo Go receipt OCR engine

**Status:** Accepted (explicit product-owner Expo Go requirement, 2026-11-14)
**Supersedes:** [ADR-0009](0009-receipt-import-ocr.md) only for its native OCR engine, dependency/patch choice and custom-native-build requirement.

## Context

After PR12, the product owner explicitly requires receipt import to work in Expo Go on a phone. The InfiniteRed ML Kit modules require a custom native build and therefore do not satisfy that requirement. Retaining receipt-only, local processing without image upload is mandatory; this is a technical replacement, not a new receipt scope or permission to restore general grocery-photo recognition.

## Decision

- Run bundled Tesseract.js 7.0.0 and Tesseract.js-core 7.0.0 with the Swedish `best_int` language model in a hidden local WebView. Use `react-native-webview@14.0.1`, included in Expo Go for SDK 58, and `expo-asset@~58.0.21` to load the static resources. Remove InfiniteRed ML Kit dependencies and their native patches.
- Bundle five pinned runtime files, approximately 5.36 MiB, with provenance, hashes and third-party/model notices in `apps/mobile/assets/ocr/`. No runtime CDN, remote model download, cloud OCR or network fallback is allowed. Metro's initial delivery of development assets is distinct from OCR inference.
- Create the worker from a local blob, supply WASM and language bytes from bundled memory, and prohibit network connections with CSP `connect-src 'none'`. Use a private WebView with cookies and WebView caching disabled. Cached assets are code/model resources, not receipt images or text.
- Keep one worker for the active flow and one recognition request at a time. Validate bridge messages and request IDs. Cancellation, timeout or engine failure resets/unmounts the WebView, including a worker stuck during initialization. The 120-second request timeout includes asset loading and initialization. WebView process crashes must allow a fresh attempt.
- Retain the 20 MiB raw-file and 30 MP input guards. Normalize format/orientation using the existing image manipulator, with JPEG quality 0.9 and proportional downsampling only when needed to cap OCR input at 8 MP. Do not restore the obsolete 1,600 px longest-edge cap for long receipts. The pixel cap is a resource guard, not measured phone memory usage or a guarantee against decode-time memory pressure.
- Treat optional Tesseract confidence as a raw 0–100 OCR score, never calibrated product identity or food-safety evidence. Keep deterministic Swedish parsing, review, explicit confirmation and existing inventory item/batch/event semantics unchanged.

## Privacy and scope boundaries

No raw receipt image or OCR text is uploaded, logged or persisted by Cena. Temporary conversion copies are cleaned up; the user's originals are never deleted. Picker caches remain OS-managed. Only confirmed inventory fields go to the authorized, atomic, idempotent bulk API. ADR-0009's receipt-only scope and safety boundaries remain in force. ML Kit/Google telemetry disclosures no longer describe this engine; do not substitute a blanket claim that the entire app has no network activity.

Expo Go requires no custom native build for receipt OCR. Custom debug builds remain optional; generated native directories remain ignored. Web retains manual entry. Offline OCR after assets load does not establish fully offline cold-start behavior, authentication or inventory saving.

## Verification and consequences

- A prototype ran Swedish short and 40-line receipt OCR in actual Expo Go 58.0.7 on an iPhone 17 Pro simulator.
- The production image helper, engine, parser and review were also exercised together with a synthetic PNG, repeated recognition and cancellation/reset. Temporary JPEG cleanup and preservation of the original were verified. This is simulator evidence, not a complete phone camera-to-inventory acceptance test.
- Physical phones and Android have not been verified. Real retailer accuracy, latency, peak phone memory, permissions and full J03 end-to-end behavior remain verification gates in the [receipt import guide](../receipt-import.md).
- Final automated verification belongs to the implementation report. Earlier ML Kit compilation or test counts do not establish that this replacement passes.
- Maintain the pinned assets and license notices explicitly. `node apps/mobile/assets/ocr/sync-assets.mjs` verifies existing bytes/notices without downloads; `--download` is an explicit maintenance operation, not runtime behavior.

## References

- [Receipt import setup and verification](../receipt-import.md)
- [Approved MVP D02, D06 and J03](../mvp-scope.md)
- [Bundled asset provenance and licenses](../../apps/mobile/assets/ocr/README.md)
