import { Platform } from 'react-native';
import { ImageManipulator } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { ReceiptOcrResult } from '../features/receipt-import/receipt-parser';
import { readReceipt, removeReceiptTempFiles } from '../features/receipt-import/receipt-ocr';

const mockDelete = jest.fn();
const mockClose = jest.fn();
let mockSize = 100_000;
let mockExists = true;
let mockHeader = Uint8Array.from([255, 216, 255, 0]);
const mockReadBytes = jest.fn(async () => mockHeader);
const mockBase64 = jest.fn(async () => '/9j/receipt');
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
    base64() {
      return mockBase64();
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

const asset: ImagePickerAsset = { uri: 'file:///source.jpg', width: 1200, height: 6000 };
const recognize = jest.fn<Promise<ReceiptOcrResult>, [string]>();
const ocrResult: ReceiptOcrResult = {
  text: 'MJÖLK 19,90',
  lines: [{ text: 'MJÖLK 19,90' }],
};
const mockRelease = jest.fn();
const mockRotate = jest.fn();
const mockSave = jest.fn();
const mockRender = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  mockSize = 100_000;
  mockExists = true;
  mockHeader = Uint8Array.from([255, 216, 255, 0]);
  mockReadBytes.mockImplementation(async () => mockHeader);
  mockBase64.mockResolvedValue('/9j/receipt');
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
  recognize.mockResolvedValue(ocrResult);
});

it('reads locally, keeps full long-receipt resolution and deletes only its conversion', async () => {
  const result = await readReceipt(asset, 90, recognize);
  expect(result.products[0]).toMatchObject({
    name: 'MJÖLK',
    quantity: null,
    storageLocation: 'FRIDGE',
  });
  expect(mockReadBytes).toHaveBeenCalledWith(32);
  expect(mockClose).toHaveBeenCalled();
  expect(ImageManipulator.manipulate).toHaveBeenCalledWith(asset.uri, {
    maxWidth: 1200,
    maxHeight: 6000,
  });
  expect(mockRotate).toHaveBeenCalledWith(90);
  expect(mockSave).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.9 });
  expect(mockBase64).toHaveBeenCalledTimes(1);
  expect(recognize).toHaveBeenCalledWith('data:image/jpeg;base64,/9j/receipt');
  expect(mockDelete.mock.calls).toEqual([['file:///converted.jpg']]);
  expect(mockRelease).toHaveBeenCalledTimes(2);
});

it.each(['android', 'ios'])('supports local OCR on %s', async (platform) => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
  expect((await readReceipt(asset, 0, recognize)).products).toHaveLength(1);
});

it('fails safely on web before attempting OCR', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  await expect(readReceipt(asset, 0, recognize)).rejects.toThrow('OCR_UNAVAILABLE');
  expect(recognize).not.toHaveBeenCalled();
});

it('proportionally bounds a 12 MP decode to 8 MP without a longest-edge cap', async () => {
  const input = { ...asset, width: 2000, height: 6000 };
  mockRender.mockResolvedValueOnce({
    width: 1632,
    height: 4898,
    saveAsync: mockSave,
    release: mockRelease,
  });
  await readReceipt(input, 0, recognize);
  expect(ImageManipulator.manipulate).toHaveBeenCalledWith(input.uri, {
    maxWidth: 1632,
    maxHeight: 4898,
  });
  expect(1632 * 4898).toBeLessThanOrEqual(8_000_000);
  expect(1632 / 4898).toBeCloseTo(input.width / input.height, 3);
  expect(recognize).toHaveBeenCalledTimes(1);
});

it.each([
  [{ ...asset, uri: 'https://example.com/private.jpg' }, 'INVALID_IMAGE'],
  [{ ...asset, width: 0 }, 'INVALID_IMAGE'],
  [{ ...asset, height: 30_000 }, 'IMAGE_TOO_LARGE'],
])('rejects invalid source metadata without decoding', async (input, code) => {
  await expect(readReceipt(input, 0, recognize)).rejects.toThrow(code);
  expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
});

it('checks the actual local file size, not only picker metadata', async () => {
  mockSize = 21 * 1024 * 1024;
  await expect(readReceipt({ ...asset, fileSize: 1 }, 0, recognize)).rejects.toThrow(
    'IMAGE_TOO_LARGE',
  );
  expect(recognize).not.toHaveBeenCalled();
});

it('rejects a renamed PDF by its file signature', async () => {
  mockHeader = Uint8Array.from([37, 80, 68, 70]);
  await expect(readReceipt(asset, 0, recognize)).rejects.toThrow('UNSUPPORTED_IMAGE');
  expect(mockClose).toHaveBeenCalled();
  expect(recognize).not.toHaveBeenCalled();
});

it.each([
  [137, 80, 78, 71, 13, 10, 26, 10],
  [...'RIFF1234WEBP'].map((char) => char.charCodeAt(0)),
  [0, 0, 0, 24, ...'ftypheic'].map((value) =>
    typeof value === 'number' ? value : value.charCodeAt(0),
  ),
])('accepts supported signatures and normalizes the local image', async (...bytes) => {
  mockHeader = Uint8Array.from(bytes);
  expect((await readReceipt(asset, 0, recognize)).products).toHaveLength(1);
});

it.each([
  [4000, 3000],
  [6000, 6000],
])('rejects a %sx%s decode over the cap before saving a conversion', async (width, height) => {
  mockRender.mockResolvedValueOnce({ width, height, release: mockRelease });
  await expect(readReceipt(asset, 0, recognize)).rejects.toThrow('IMAGE_TOO_LARGE');
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockRelease).toHaveBeenCalledTimes(2);
});

it('cleans up when OCR rejects without exposing its private error', async () => {
  recognize.mockRejectedValueOnce(new Error('private path/payment text'));
  await expect(readReceipt(asset, 0, recognize)).rejects.toThrow(/^OCR_FAILED$/);
  expect(mockDelete).toHaveBeenCalledWith('file:///converted.jpg');
  expect((await readReceipt(asset, 0, recognize)).products).toHaveLength(1);
});

it.each([
  { text: '', lines: [] },
  { text: ' \n ', lines: [{ text: '  ' }] },
])('reports an empty OCR result honestly', async (result) => {
  recognize.mockResolvedValueOnce(result);
  await expect(readReceipt(asset, 0, recognize)).rejects.toThrow('NO_TEXT');
  expect(mockDelete).toHaveBeenCalled();
});

it('accepts recognized lines even when the full text is empty', async () => {
  recognize.mockResolvedValueOnce({ text: '', lines: ocrResult.lines });
  expect((await readReceipt(asset, 0, recognize)).products).toHaveLength(1);
});

it.each([
  null,
  { text: 'x', lines: null },
  { text: 'x', lines: [{ text: 1 }] },
  {
    text: 'x',
    lines: [{ text: 'milk', frame: { left: -1, top: 0, right: 100, bottom: 20 } }],
  },
  { text: 'x'.repeat(100_001), lines: [] },
])('rejects malformed or oversized callback output', async (result) => {
  recognize.mockResolvedValueOnce(result as never);
  await expect(readReceipt(asset, 0, recognize)).rejects.toThrow('OCR_FAILED');
  expect(mockDelete).toHaveBeenCalledWith('file:///converted.jpg');
});

it('prevents parallel OCR operations and does not clean active files', async () => {
  let finish: ((result: ReceiptOcrResult) => void) | undefined;
  recognize.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = readReceipt(asset, 0, recognize);
  for (let index = 0; index < 20 && !finish; index++) await Promise.resolve();
  expect(finish).toBeDefined();
  removeReceiptTempFiles();
  expect(mockDelete).not.toHaveBeenCalled();
  await expect(readReceipt(asset, 0, recognize)).rejects.toThrow('OCR_FAILED');
  finish?.({ text: '', lines: [] });
  await expect(first).rejects.toThrow('NO_TEXT');
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

it.each(['missing', 'empty'])('rejects a %s source file without decoding', async (state) => {
  mockExists = state !== 'missing';
  mockSize = state === 'empty' ? 0 : 100_000;
  await expect(readReceipt(asset, 0, recognize)).rejects.toThrow('INVALID_IMAGE');
  expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
  expect(recognize).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
});

it('rejects an unsupported rotation before decoding', async () => {
  await expect(readReceipt(asset, 45, recognize)).rejects.toThrow('INVALID_IMAGE');
  expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
});

it.each(['file:///source.jpg', 'https://example.com/converted.jpg'])(
  'never deletes an invalid conversion URI %s',
  async (uri) => {
    mockSave.mockResolvedValueOnce({ uri });
    await expect(readReceipt(asset, 0, recognize)).rejects.toThrow('INVALID_IMAGE');
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalledTimes(2);
    expect(recognize).not.toHaveBeenCalled();
  },
);

it('cancels before starting and releases the operation lock', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(readReceipt(asset, 0, recognize, controller.signal)).rejects.toThrow(
    'OCR_CANCELLED',
  );
  expect(mockReadBytes).not.toHaveBeenCalled();
  expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
  expect(recognize).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
  expect((await readReceipt(asset, 0, recognize)).products).toHaveLength(1);
});

it.each(['signature', 'render', 'save', 'base64', 'ocr'] as const)(
  'cancels during %s without returning results, retaining the lock until settlement',
  async (stage) => {
    const controller = new AbortController();
    let finish!: () => void;
    const paused = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const started = new Promise<void>((resolve) => {
      const wait = async () => {
        resolve();
        await paused;
      };
      if (stage === 'signature')
        mockReadBytes.mockImplementationOnce(async () => {
          await wait();
          return mockHeader;
        });
      if (stage === 'render')
        mockRender.mockImplementationOnce(async () => {
          await wait();
          return { width: 1200, height: 6000, saveAsync: mockSave, release: mockRelease };
        });
      if (stage === 'save')
        mockSave.mockImplementationOnce(async () => {
          await wait();
          return { uri: 'file:///converted.jpg' };
        });
      if (stage === 'base64')
        mockBase64.mockImplementationOnce(async () => {
          await wait();
          return '/9j/receipt';
        });
      if (stage === 'ocr')
        recognize.mockImplementationOnce(async () => {
          await wait();
          return ocrResult;
        });
    });
    const reading = readReceipt(asset, 0, recognize, controller.signal);
    const rejected = expect(reading).rejects.toThrow('OCR_CANCELLED');
    await started;
    controller.abort();
    removeReceiptTempFiles();
    expect(mockDelete).not.toHaveBeenCalled();
    await expect(readReceipt(asset, 0, recognize)).rejects.toThrow('OCR_FAILED');
    finish();
    await rejected;
    expect(recognize).toHaveBeenCalledTimes(stage === 'ocr' ? 1 : 0);
    expect(mockDelete.mock.calls).toEqual(
      ['save', 'base64', 'ocr'].includes(stage) ? [['file:///converted.jpg']] : [],
    );
    expect(mockRelease).toHaveBeenCalledTimes(stage === 'signature' ? 0 : 2);
    expect((await readReceipt(asset, 0, recognize)).products).toHaveLength(1);
  },
);
