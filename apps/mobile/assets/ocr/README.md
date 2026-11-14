# Bundled local OCR resources

The five runtime files in `manifest.json` are unmodified, pinned artifacts. Only
their filenames change (`.js` to `.txt`) so Metro treats browser JS as assets,
not React Native modules. Download URLs are build/maintenance provenance, never
runtime engine endpoints. Total runtime bytes: 5,621,985 (5.36 MiB), excluding
notices. Swedish gzip expands to 4,167,074 bytes.

From the repository root:

```sh
node apps/mobile/assets/ocr/sync-assets.mjs
# Explicit maintenance only; downloads are verified BEFORE replacing local files:
node apps/mobile/assets/ocr/sync-assets.mjs --download
# Regenerate the distributed notice asset after reviewing license changes:
node apps/mobile/assets/ocr/sync-assets.mjs --write-notices
```

No package install, native module, remote OCR, or runtime CDN is required by these
resources. Initial development asset delivery in Expo Go still uses Metro.
The engine uses baseline LSTM WASM (not SIMD, relaxed SIMD, or legacy OCR).
Do not also bundle the `.wasm.js` variant: it embeds a duplicate WASM binary.

## Licensing and provenance

`THIRD_PARTY_NOTICES.txt` is generated from the reviewed upstream notices below
and included as a static Expo asset. Retain the original minifier notice files;
their filenames are referenced by the untouched minified JS headers.

- Tesseract.js 7.0.0: Apache-2.0; `https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/LICENSE.md`.
- Tesseract.js-core 7.0.0: Apache-2.0; `https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/LICENSE`.
- Emscripten 4.0.15 generated runtime: retained MIT/UIUC notices from `https://raw.githubusercontent.com/emscripten-core/emscripten/4.0.15/LICENSE`. Version pinned by core v7.0.0 `build-with-docker.sh`.
- Swedish model: Apache-2.0 upstream tessdata license from `https://raw.githubusercontent.com/naptha/tessdata/gh-pages/LICENSE`.
- The `@tesseract.js-data/swe@1.0.0` NPM wrapper declares MIT metadata but ships no LICENSE file at its root. Cena retains the upstream model's Apache-2.0 license instead of treating wrapper metadata as relicensing the traineddata.
- Extracted upstream minifier comments: `https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js.LICENSE.txt` and `worker.min.js.LICENSE.txt` at the same path.
- Bundled JS dependency notices: NPM `regenerator-runtime@0.13.11/LICENSE` (MIT), `buffer@6.0.3/LICENSE` (MIT), `base64-js@1.5.1/LICENSE` (MIT), `ieee754@1.2.1/LICENSE` (BSD-3-Clause), `bmp-js@0.1.0/LICENSE` (MIT), `is-url@1.2.4/LICENSE-MIT` (MIT), `idb-keyval@6.2.2/LICENCE` (Apache-2.0), `wasm-feature-detect@1.8.0/LICENSE` (Apache-2.0), `zlibjs@0.3.1/LICENSE` (MIT). Retrieved using the versioned jsDelivr NPM paths; these are notice sources, not new app dependencies.

Core's native dependency revisions are taken from the v7.0.0 git submodule pins:
`https://api.github.com/repos/naptha/tesseract.js-core/contents/third_party?ref=v7.0.0`.
The corresponding upstream license files are retained, including image decoder
dependencies even though Cena only passes normalized PNG/JPEG:

| Dependency | Source revision | Retained upstream file |
| --- | --- | --- |
| Balearica/tesseract | 2a9c1c49c360462733c386d2a44fcd22c4e21411 | LICENSE (Apache-2.0) |
| DanBloomberg/leptonica | 4af068b56a9674da915debea4ed7e1b9885b17e8 | leptonica-license.txt (BSD-2-Clause) |
| mirrorer/giflib | fa37672085ce4b3d62c51627ab3c8cf2dda8009a | COPYING (MIT) |
| LuaDist/libjpeg | 6c0fcb8ddee365e7abc4d332662b06900612e923 | README (IJG license and attribution) |
| glennrp/libpng | a37d4836519517bdce6cb9d956092321eca3e73b | LICENSE (libpng license) |
| libtiff/libtiff (GitLab) | b51bb157123264e26d34c09cc673d213aea61fc7 | COPYRIGHT (libtiff license) |
| webmproject/libwebp | 20ef03ee351d4ff03fc5ff3ec4804a879d1b9d5c | COPYING (BSD-3-Clause) |
| JuliaMath/openlibm | ae2d91698508701c83cab83714d42a1146dccf85 | LICENSE.md (retained per-component notices) |
| madler/zlib | 21767c654d31d2dccdde4330529775c6c5fd5389 | license notice extracted from zlib.h (Zlib) |

GitHub file URLs follow `https://raw.githubusercontent.com/OWNER/REPO/REVISION/FILE`.
libtiff uses `https://gitlab.com/libtiff/libtiff/-/raw/REVISION/COPYRIGHT`.
The zlib extraction removes API declarations, not license conditions; its source
URL is also recorded in `LICENSE-zlib.txt`. All other retained license texts are
unchanged upstream downloads.
