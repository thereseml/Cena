import { File } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';
import { parseReceipt, type ParsedReceipt, type ReceiptOcrResult } from './receipt-parser';

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 30_000_000;
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

export async function readReceipt(asset: ImagePickerAsset, rotation = 0): Promise<ParsedReceipt> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') throw new Error('OCR_UNAVAILABLE');
  if (reading) throw new Error('OCR_FAILED');
  reading = true;
  let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
  let image: Awaited<ReturnType<NonNullable<typeof context>['renderAsync']>> | undefined;
  try {
    if (!/^file:\/\//.test(asset.uri) || ![0, 90, 180, 270].includes(rotation)) {
      throw new Error('INVALID_IMAGE');
    }
    validateDimensions(asset.width, asset.height);
    const source = new File(asset.uri);
    validateFile(source);
    await validateFormat(source);

    // The wrapper eagerly requires its native module. Optional lookup keeps manual
    // entry usable in Expo Go/web instead of crashing when this screen loads.
    const native = requireOptionalNativeModule<{
      recognizeText: typeof import('@infinitered/react-native-mlkit-text-recognition').recognizeText;
    }>('RNMLKitTextRecognition');
    if (!native) throw new Error('OCR_UNAVAILABLE');

    // Normalize orientation/format without the old 1600px cloud-upload downscale.
    context = ImageManipulator.manipulate(asset.uri);
    if (rotation) context.rotate(rotation);
    image = await context.renderAsync();
    validateDimensions(image.width, image.height);
    const converted = await image.saveAsync({ format: SaveFormat.JPEG, compress: 1 });
    if (converted.uri === asset.uri || !converted.uri.startsWith('file://')) {
      throw new Error('INVALID_IMAGE');
    }
    temporaryFiles.add(converted.uri);
    validateFile(new File(converted.uri));
    let result: Awaited<ReturnType<typeof native.recognizeText>>;
    try {
      result = await native.recognizeText(converted.uri);
    } catch {
      throw new Error('OCR_FAILED');
    }
    // Validate shape before iterating native data. The parser validates text and geometry bounds.
    if (
      !result ||
      typeof result.text !== 'string' ||
      result.text.length > 100_000 ||
      !Array.isArray(result.blocks) ||
      result.blocks.length > 2_000
    ) {
      throw new Error('OCR_FAILED');
    }
    const lines: ReceiptOcrResult['lines'] = [];
    for (const block of result.blocks) {
      if (!block || !Array.isArray(block.lines) || block.lines.length + lines.length > 2_000) {
        throw new Error('OCR_FAILED');
      }
      for (const line of block.lines) {
        if (!line || typeof line.text !== 'string') throw new Error('OCR_FAILED');
        lines.push({ text: line.text, ...(line.frame ? { frame: line.frame } : {}) });
      }
    }
    if (!result.text.trim() && !lines.some((line) => line.text.trim())) throw new Error('NO_TEXT');
    return parseReceipt({ text: result.text, lines });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (
      [
        'OCR_UNAVAILABLE',
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
