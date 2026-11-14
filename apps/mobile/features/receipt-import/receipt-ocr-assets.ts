/* eslint-disable @typescript-eslint/no-require-imports -- Metro registers static assets through require. */
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

export interface ReceiptOcrAssets {
  main: string;
  worker: string;
  glue: string;
  wasm: string;
  language: string;
}

async function readAsset(moduleId: number, binary = false): Promise<string> {
  const asset = await Asset.fromModule(moduleId).downloadAsync();
  if (!asset.localUri?.startsWith('file://')) throw new Error('OCR_UNAVAILABLE');
  const file = new File(asset.localUri);
  return binary ? file.base64() : file.text();
}

// Keep runtime bytes scoped to the mounted engine, not a module-level image/text cache.
export async function loadReceiptOcrAssets(): Promise<ReceiptOcrAssets> {
  const [main, worker, glue, wasm, language] = await Promise.all([
    readAsset(require('../../assets/ocr/tesseract-main.txt')),
    readAsset(require('../../assets/ocr/tesseract-worker.txt')),
    readAsset(require('../../assets/ocr/tesseract-glue.txt')),
    readAsset(require('../../assets/ocr/tesseract-core.wasm'), true),
    readAsset(require('../../assets/ocr/swe.traineddata.gz'), true),
    Asset.loadAsync(require('../../assets/ocr/THIRD_PARTY_NOTICES.txt')),
  ]);
  return { main, worker, glue, wasm, language };
}
