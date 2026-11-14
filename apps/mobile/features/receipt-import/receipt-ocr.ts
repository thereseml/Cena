import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';
import { parseReceipt, type ParsedReceipt, type ReceiptOcrResult } from './receipt-parser';

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 30_000_000;
const MAX_OCR_PIXELS = 8_000_000;
const temporaryFiles = new Set<string>();
let reading = false;

export function removeReceiptTempFiles(): void {
  // Never delete a file while native OCR may still be reading it.
  if (reading) return;
  for (const uri of temporaryFiles) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
      temporaryFiles.delete(uri);
    } catch {
      // Retain failed deletions for the next cleanup; do not log private paths.
    }
  }
}

function validateDimensions(width: number, height: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new Error('INVALID_IMAGE');
  }
  if (width * height > MAX_PIXELS) throw new Error('IMAGE_TOO_LARGE');
}

function validateFile(file: File): void {
  if (!file.exists || !file.size) throw new Error('INVALID_IMAGE');
  if (file.size > MAX_BYTES) throw new Error('IMAGE_TOO_LARGE');
}

async function validateFormat(file: File): Promise<void> {
  const handle = file.open();
  try {
    const bytes = await handle.readBytes(32);
    const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    const webp = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    const heic =
      ascii(4, 8) === 'ftyp' &&
      ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(ascii(8, 12));
    if (!jpeg && !png && !webp && !heic) throw new Error('UNSUPPORTED_IMAGE');
  } finally {
    handle.close();
  }
}

export async function readReceipt(
  asset: ImagePickerAsset,
  rotation: number,
  recognize: (dataUrl: string) => Promise<ReceiptOcrResult>,
  signal?: AbortSignal,
): Promise<ParsedReceipt> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') throw new Error('OCR_UNAVAILABLE');
  if (reading) throw new Error('OCR_FAILED');
  reading = true;
  let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
  let image: Awaited<ReturnType<NonNullable<typeof context>['renderAsync']>> | undefined;
  function checkCancelled() {
    if (signal?.aborted) throw new Error('OCR_CANCELLED');
  }
  try {
    checkCancelled();
    if (!/^file:\/\//.test(asset.uri) || ![0, 90, 180, 270].includes(rotation)) {
      throw new Error('INVALID_IMAGE');
    }
    validateDimensions(asset.width, asset.height);
    const source = new File(asset.uri);
    validateFile(source);
    await validateFormat(source);
    checkCancelled();
    // Bound WebView/WASM bitmap memory, preserving aspect ratio and long receipts.
    const scale = Math.min(1, Math.sqrt(MAX_OCR_PIXELS / (asset.width * asset.height)));
    context = ImageManipulator.manipulate(asset.uri, {
      maxWidth: Math.floor(asset.width * scale),
      maxHeight: Math.floor(asset.height * scale),
    });
    if (rotation) context.rotate(rotation);
    image = await context.renderAsync();
    checkCancelled();
    validateDimensions(image.width, image.height);
    if (image.width * image.height > MAX_OCR_PIXELS) throw new Error('IMAGE_TOO_LARGE');
    const converted = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
    if (converted.uri === asset.uri || !converted.uri.startsWith('file://')) {
      throw new Error('INVALID_IMAGE');
    }
    temporaryFiles.add(converted.uri);
    checkCancelled();
    const file = new File(converted.uri);
    validateFile(file);
    const dataUrl = `data:image/jpeg;base64,${await file.base64()}`;
    checkCancelled();
    const result = await recognize(dataUrl);
    checkCancelled();
    const parsed = parseReceipt(result);
    if (!result.text.trim() && !result.lines.some((line) => line.text.trim()))
      throw new Error('NO_TEXT');
    return parsed;
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (
      [
        'OCR_UNAVAILABLE',
        'OCR_CANCELLED',
        'OCR_FAILED',
        'NO_TEXT',
        'INVALID_IMAGE',
        'IMAGE_TOO_LARGE',
        'UNSUPPORTED_IMAGE',
      ].includes(code)
    ) {
      throw new Error(code);
    }
    throw new Error('OCR_FAILED');
  } finally {
    image?.release();
    context?.release();
    reading = false;
    removeReceiptTempFiles();
  }
}
