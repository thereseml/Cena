import { Platform } from 'react-native';
import { ImageManipulator } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { recognizeText } from '@infinitered/react-native-mlkit-text-recognition';
import { requireOptionalNativeModule } from 'expo';
import { readReceipt, removeReceiptTempFiles } from '../features/receipt-import/receipt-ocr';

const mockDelete = jest.fn();
const mockClose = jest.fn();
let mockSize = 100_000;
let mockExists = true;
let mockHeader = Uint8Array.from([255, 216, 255, 0]);
const mockReadBytes = jest.fn(async () => mockHeader);
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get exists() {
      return mockExists;
    }
    get size() {
      return mockSize;
    }
    open() {
      return { readBytes: mockReadBytes, close: mockClose };
    }
    delete() {
      mockDelete(this.uri);
    }
  },
}));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('@infinitered/react-native-mlkit-text-recognition', () => ({ recognizeText: jest.fn() }));
jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }));

const asset: ImagePickerAsset = { uri: 'file:///source.jpg', width: 1200, height: 6000 };
const frame = { left: 0, top: 0, right: 100, bottom: 20 };
const mockRelease = jest.fn();
const mockRotate = jest.fn();
const mockSave = jest.fn();
const mockRender = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  mockSize = 100_000;
  jest.mocked(requireOptionalNativeModule).mockReturnValue({ recognizeText });
  mockExists = true;
  mockHeader = Uint8Array.from([255, 216, 255, 0]);
  mockReadBytes.mockImplementation(async () => mockHeader);
  mockDelete.mockImplementation(() => undefined);
  mockSave.mockResolvedValue({ uri: 'file:///converted.jpg' });
  mockRender.mockResolvedValue({
    width: 1200,
    height: 6000,
    saveAsync: mockSave,
    release: mockRelease,
  });
  jest.mocked(ImageManipulator.manipulate).mockReturnValue({
    rotate: mockRotate,
    renderAsync: mockRender,
    release: mockRelease,
  } as never);
  jest.mocked(recognizeText).mockResolvedValue({
    text: 'MJÖLK 19,90',
    blocks: [
      {
        text: 'MJÖLK 19,90',
        frame,
        recognizedLanguages: ['sv'],
        lines: [{ text: 'MJÖLK 19,90', frame, recognizedLanguages: ['sv'], elements: [] }],
      },
    ],
  });
});

it('reads locally, keeps full long-receipt resolution and deletes only its conversion', async () => {
  const result = await readReceipt(asset, 90);
  expect(result.products[0]).toMatchObject({
    name: 'MJÖLK',
    quantity: null,
    storageLocation: 'FRIDGE',
  });
  expect(mockReadBytes).toHaveBeenCalledWith(32);
  expect(mockClose).toHaveBeenCalled();
  expect(ImageManipulator.manipulate).toHaveBeenCalledWith(asset.uri);
  expect(mockRotate).toHaveBeenCalledWith(90);
  expect(mockSave).toHaveBeenCalledWith({ format: 'jpeg', compress: 1 });
  expect(recognizeText).toHaveBeenCalledWith('file:///converted.jpg');
  expect(mockDelete.mock.calls).toEqual([['file:///converted.jpg']]);
  expect(mockRelease).toHaveBeenCalledTimes(2);
});

it.each(['android', 'ios'])('supports native %s without a network OCR call', async (platform) => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
  expect((await readReceipt(asset)).products).toHaveLength(1);
});

it('fails safely on web before attempting OCR', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  await expect(readReceipt(asset)).rejects.toThrow('OCR_UNAVAILABLE');
  expect(recognizeText).not.toHaveBeenCalled();
});

it('offers manual fallback when the native module is missing in Expo Go', async () => {
  jest.mocked(requireOptionalNativeModule).mockReturnValueOnce(null);
  await expect(readReceipt(asset)).rejects.toThrow('OCR_UNAVAILABLE');
  expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
});

it.each([
  [{ ...asset, uri: 'https://example.com/private.jpg' }, 'INVALID_IMAGE'],
  [{ ...asset, width: 0 }, 'INVALID_IMAGE'],
  [{ ...asset, height: 30_000 }, 'IMAGE_TOO_LARGE'],
])('rejects invalid source metadata without decoding', async (input, code) => {
  await expect(readReceipt(input)).rejects.toThrow(code);
  expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
});

it('checks the actual local file size, not only picker metadata', async () => {
  mockSize = 21 * 1024 * 1024;
  await expect(readReceipt({ ...asset, fileSize: 1 })).rejects.toThrow('IMAGE_TOO_LARGE');
  expect(recognizeText).not.toHaveBeenCalled();
});

it('rejects a renamed PDF by its file signature', async () => {
  mockHeader = Uint8Array.from([37, 80, 68, 70]);
  await expect(readReceipt(asset)).rejects.toThrow('UNSUPPORTED_IMAGE');
  expect(mockClose).toHaveBeenCalled();
  expect(recognizeText).not.toHaveBeenCalled();
});

it.each([
  [137, 80, 78, 71, 13, 10, 26, 10],
  [...'RIFF1234WEBP'].map((char) => char.charCodeAt(0)),
  [0, 0, 0, 24, ...'ftypheic'].map((value) =>
    typeof value === 'number' ? value : value.charCodeAt(0),
  ),
])('accepts supported signatures and normalizes the local image', async (...bytes) => {
  mockHeader = Uint8Array.from(bytes);
  expect((await readReceipt(asset)).products).toHaveLength(1);
});

it('rejects decoded dimensions over the limit before saving a conversion', async () => {
  mockRender.mockResolvedValueOnce({ width: 6000, height: 6000, release: mockRelease });
  await expect(readReceipt(asset)).rejects.toThrow('IMAGE_TOO_LARGE');
  expect(mockSave).not.toHaveBeenCalled();
});

it('cleans up when OCR rejects without exposing its private error', async () => {
  jest.mocked(recognizeText).mockRejectedValueOnce(new Error('private path/payment text'));
  await expect(readReceipt(asset)).rejects.toThrow(/^OCR_FAILED$/);
  expect(mockDelete).toHaveBeenCalledWith('file:///converted.jpg');
  expect((await readReceipt(asset)).products).toHaveLength(1);
});

it('reports an empty OCR result honestly', async () => {
  jest.mocked(recognizeText).mockResolvedValueOnce({ text: '', blocks: [] });
  await expect(readReceipt(asset)).rejects.toThrow('NO_TEXT');
  expect(mockDelete).toHaveBeenCalled();
});

it.each([
  { text: 'x', blocks: null },
  { text: 'x', blocks: [{ lines: null }] },
  {
    text: 'x',
    blocks: [{ lines: [{ text: 'milk', frame: { left: -1, top: 0, right: 100, bottom: 20 } }] }],
  },
  { text: 'x'.repeat(100_001), blocks: [] },
])('rejects malformed or oversized native output', async (result) => {
  jest.mocked(recognizeText).mockResolvedValueOnce(result as never);
  await expect(readReceipt(asset)).rejects.toThrow('OCR_FAILED');
  expect(mockDelete).toHaveBeenCalledWith('file:///converted.jpg');
});

it('prevents parallel native operations and does not clean active files', async () => {
  let finish: ((result: Awaited<ReturnType<typeof recognizeText>>) => void) | undefined;
  jest.mocked(recognizeText).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = readReceipt(asset);
  for (let index = 0; index < 20 && !finish; index++) await Promise.resolve();
  expect(finish).toBeDefined();
  removeReceiptTempFiles();
  expect(mockDelete).not.toHaveBeenCalled();
  await expect(readReceipt(asset)).rejects.toThrow('OCR_FAILED');
  finish?.({ text: '', blocks: [] });
  await expect(first).rejects.toThrow('NO_TEXT');
  expect(mockDelete).toHaveBeenCalledTimes(1);
});
