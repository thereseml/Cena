import {
  createReceiptOcrHtml,
  MAX_OCR_DATA_URL_LENGTH,
  parseReceiptOcrMessage,
  validateReceiptOcrDataUrl,
} from '../features/receipt-import/receipt-ocr-html';

const { Script, runInNewContext } = jest.requireActual<{
  Script: new (source: string) => unknown;
  runInNewContext: (source: string, context: Record<string, unknown>) => void;
}>('node:vm');
const { TextEncoder } = jest.requireActual<{ TextEncoder: typeof globalThis.TextEncoder }>(
  'node:util',
);

const assets = { main: 'main', worker: 'worker', glue: 'glue', wasm: 'AA==', language: 'AA==' };
const result = {
  text: 'MJÖLK 16,90',
  confidence: 92,
  lines: [
    { text: 'MJÖLK 16,90', confidence: 91, frame: { left: 1, top: 2, right: 30, bottom: 20 } },
  ],
};
const parse = (value: unknown) =>
  parseReceiptOcrMessage(JSON.stringify({ type: 'result', id: 'ocr-1', result: value }), ['ocr-1']);

it('escapes trusted asset HTML delimiters and generates syntactically valid JS with no network CSP', () => {
  const html = createReceiptOcrHtml(
    { ...assets, main: '</script><img src="https://example.com">' },
    'ocr-1',
  );
  expect(html.match(/<\/script>/g)).toHaveLength(1);
  expect(html).toContain('\\u003c/script>');
  expect(html).toContain("default-src 'none'; connect-src 'none'");
  expect(html).toContain('worker-src blob:');
  expect(html).toContain('wasmBinary: wasmBytes');
  expect(html).toContain("cacheMethod: 'none'");
  expect(html).toContain('workerBlobURL: false');
  const script = html.split('<script>')[1].split('</script>')[0];
  expect(() => new Script(script)).not.toThrow();
});

it('preserves supplied confidence and does not fabricate missing values', () => {
  expect(parse(result)).toEqual({
    type: 'result',
    id: 'ocr-1',
    result,
  });
  expect(parse({ text: 'text', lines: [{ text: 'text' }] })).toStrictEqual({
    type: 'result',
    id: 'ocr-1',
    result: { text: 'text', lines: [{ text: 'text' }] },
  });
  expect(
    parseReceiptOcrMessage('{"type":"result","id":"old","result":null}', ['ocr-1']),
  ).toBeNull();
  expect(
    parseReceiptOcrMessage('{"type":"error","id":"ocr-1","code":"secret"}', ['ocr-1']),
  ).toEqual({ type: 'error', id: 'ocr-1', code: 'OCR_FAILED' });
});

it.each([0, 100])(
  'preserves raw boundary confidence %s, including lines without frames',
  (confidence) => {
    const value = { text: 'text', confidence, lines: [{ text: 'text', confidence }] };
    expect(parse(value)).toStrictEqual({ type: 'result', id: 'ocr-1', result: value });
  },
);

it('accepts session errors while ignoring stale or idle results before validating their payload', () => {
  const ids = ['ocr-1', 'ocr-2'];
  expect(
    parseReceiptOcrMessage('{"type":"result","id":"ocr-1","result":null}', ids, 'ocr-2'),
  ).toBeNull();
  expect(
    parseReceiptOcrMessage('{"type":"result","id":"ocr-1","result":null}', ['ocr-1'], null),
  ).toBeNull();
  expect(
    parseReceiptOcrMessage('{"type":"error","id":"ocr-1","code":"OCR_FAILED"}', ['ocr-1'], null),
  ).toEqual({ type: 'error', id: 'ocr-1', code: 'OCR_FAILED' });
});

it.each([
  null,
  {},
  { text: '\0', lines: [] },
  { text: 'x'.repeat(100_001), lines: [] },
  { text: '', lines: Array.from({ length: 2_001 }, () => ({ text: '' })) },
  { text: '', lines: [{ text: 'x'.repeat(1_001) }] },
  { text: '', lines: Array.from({ length: 101 }, () => ({ text: 'x'.repeat(1_000) })) },
  { text: '', lines: [{ text: 'line\nline' }] },
  { text: '', lines: [{ text: '\0' }] },
  { ...result, confidence: -1 },
  { ...result, confidence: 101 },
  { ...result, lines: [{ text: 'text', confidence: '91' }] },
  ...[-1, 1_000_001, '1', null].map((left) => ({
    text: 'text',
    lines: [{ text: 'text', frame: { left, top: 0, right: 4, bottom: 2 } }],
  })),
  { text: 'text', lines: [{ text: 'text', frame: { left: 4, top: 0, right: 4, bottom: 2 } }] },
  { text: 'text', lines: [{ text: 'text', frame: { left: 0, top: 4, right: 4, bottom: 2 } }] },
])('rejects malformed/oversized OCR output %#', (value) => {
  expect(() => parse(value)).toThrow('OCR_FAILED');
});

it('enforces UTF-8 message bytes, not just JS character count', () => {
  expect(() => parseReceiptOcrMessage('x'.repeat(1024 * 1024 + 1), [])).toThrow('OCR_FAILED');
  expect(() =>
    parseReceiptOcrMessage(JSON.stringify({ id: 'old', padding: 'å'.repeat(530_000) }), []),
  ).toThrow('OCR_FAILED');
});

it('only accepts bounded PNG/JPEG base64, never URLs or script strings', () => {
  expect(() => validateReceiptOcrDataUrl('data:image/jpeg;base64,/9j/')).not.toThrow();
  expect(() => validateReceiptOcrDataUrl('data:image/png;base64,AA==')).not.toThrow();
  for (const input of [
    'file:///receipt.jpg',
    'https://example.com',
    'data:image/svg+xml;base64,AA==',
    'data:image/png;base64,',
    'data:image/png;base64,AA;alert(1)',
    'data:image/png;base64,AAA',
  ]) {
    expect(() => validateReceiptOcrDataUrl(input)).toThrow('INVALID_IMAGE');
  }
  expect(() => validateReceiptOcrDataUrl('x'.repeat(MAX_OCR_DATA_URL_LENGTH + 1))).toThrow(
    'IMAGE_TOO_LARGE',
  );
});

type WorkerFailureListener = (event: {
  preventDefault: () => void;
  message?: string;
  data?: unknown;
}) => void;

async function browser() {
  const postMessage = jest.fn();
  const listeners = new Map<string, WorkerFailureListener>();
  const worker = {
    recognize: jest.fn(),
    setParameters: jest.fn().mockResolvedValue(undefined),
    worker: {
      addEventListener: jest.fn((type: string, listener: WorkerFailureListener) =>
        listeners.set(type, listener),
      ),
    },
  };
  const createWorker = jest.fn().mockResolvedValue(worker);
  const window: {
    ReactNativeWebView: { postMessage: typeof postMessage };
    cenaRecognize?: (packet: { id: string; dataUrl: string | null }) => Promise<void>;
  } = { ReactNativeWebView: { postMessage } };
  const createObjectURL = jest.fn().mockReturnValue('blob:local');
  const revokeObjectURL = jest.fn();
  const html = createReceiptOcrHtml(assets, 'ocr-1');
  runInNewContext(html.split('<script>')[1].split('</script>')[0], {
    window,
    console: { ...console },
    Tesseract: { createWorker },
    TextEncoder,
    URL: { createObjectURL, revokeObjectURL },
    Blob: class {
      constructor(public parts: string[]) {}
    },
    document: {
      createElement: () => ({}),
      head: { appendChild: (script: { onload: () => void }) => script.onload() },
    },
  });
  await new Promise<void>((resolve) => setImmediate(() => resolve()));
  return { postMessage, worker, createWorker, window, createObjectURL, listeners };
}

it.each(['error', 'messageerror'])(
  'sanitizes worker %s events after ready, under load and while idle',
  async (type) => {
    const { postMessage, worker, window, listeners } = await browser();
    const preventDefault = jest.fn();
    const event = { preventDefault, message: 'private worker error', data: 'private image bytes' };
    listeners.get(type)!(event);
    expect(JSON.parse(postMessage.mock.calls.at(-1)![0])).toEqual({
      type: 'error',
      id: 'ocr-1',
      code: 'OCR_FAILED',
    });
    worker.recognize.mockReturnValue(new Promise(() => undefined));
    void window.cenaRecognize!({ id: 'ocr-2', dataUrl: 'data:image/png;base64,AA==' });
    listeners.get(type)!(event);
    expect(JSON.parse(postMessage.mock.calls.at(-1)![0])).toEqual({
      type: 'error',
      id: 'ocr-2',
      code: 'OCR_FAILED',
    });
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(postMessage.mock.calls.join(' ')).not.toContain('private');
  },
);

it('initializes once, uses native IDs, maps geometry, clears image packets and suppresses raw errors', async () => {
  const { postMessage, worker, createWorker, window, createObjectURL } = await browser();
  expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({ type: 'ready', id: 'ocr-1' });
  expect(createWorker).toHaveBeenCalledWith(
    'swe',
    1,
    expect.objectContaining({ workerBlobURL: false, cacheMethod: 'none' }),
  );
  const bootstrap = createObjectURL.mock.calls[1][0].parts[0] as string;
  expect(bootstrap).toContain('return new Response(languageBytes)');
  expect(bootstrap).toContain('throw new Error("NETWORK_DISABLED")');
  worker.recognize.mockResolvedValue({
    data: {
      text: result.text,
      confidence: 92,
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: result.text + '\n',
                  bbox: { x0: 1, y0: 2, x1: 30, y1: 20 },
                  confidence: 91,
                },
              ],
            },
          ],
        },
      ],
    },
  });
  const packet = { id: 'ocr-2', dataUrl: 'data:image/png;base64,AA==' };
  await window.cenaRecognize!(packet);
  expect(packet.dataUrl).toBeNull();
  expect(JSON.parse(postMessage.mock.calls[1][0])).toEqual({ type: 'result', id: 'ocr-2', result });
  worker.recognize.mockRejectedValue(new Error('private image details'));
  await window.cenaRecognize!({ id: 'ocr-3', dataUrl: 'data:image/png;base64,AA==' });
  expect(JSON.parse(postMessage.mock.calls[2][0])).toEqual({
    type: 'error',
    id: 'ocr-3',
    code: 'OCR_FAILED',
  });
  expect(createWorker).toHaveBeenCalledTimes(1);
  expect(postMessage.mock.calls.join(' ')).not.toContain('private image details');
});

it('the worker bootstrap serves only bundled language bytes and supplies WASM without network fallback', async () => {
  const { createObjectURL } = await browser();
  const bootstrap = createObjectURL.mock.calls[1][0].parts[0] as string;
  class LocalResponse {
    constructor(public bytes: Uint8Array) {}
  }
  const core = jest.fn();
  const network = jest.fn();
  const self: {
    fetch?: (url: string) => Promise<LocalResponse>;
    TesseractCore?: (options: Record<string, unknown>) => unknown;
    XMLHttpRequest?: new () => unknown;
  } = {};
  runInNewContext(bootstrap, {
    self,
    console: { ...console },
    atob,
    Uint8Array,
    Response: LocalResponse,
    TesseractCore: core,
    fetch: network,
    glue: undefined,
    worker: undefined,
  });
  const language = await self.fetch!('https://cena-ocr.invalid/swe.traineddata.gz');
  expect(language.bytes).toEqual(Uint8Array.of(0));
  await expect(self.fetch!('https://cdn.jsdelivr.net/model')).rejects.toThrow('NETWORK_DISABLED');
  await expect(self.fetch!('file:///private/receipt.jpg')).rejects.toThrow('NETWORK_DISABLED');
  expect(() => new self.XMLHttpRequest!()).toThrow('NETWORK_DISABLED');
  self.TesseractCore!({ setting: true });
  expect(core).toHaveBeenCalledWith(
    expect.objectContaining({ wasmBinary: Uint8Array.of(0), setting: true }),
  );
  expect(network).not.toHaveBeenCalled();
});
