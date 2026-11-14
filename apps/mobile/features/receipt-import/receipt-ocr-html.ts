import type { ReceiptOcrAssets } from './receipt-ocr-assets';
import type { ReceiptOcrResult } from './receipt-parser';

export const MAX_OCR_DATA_URL_LENGTH = 28 * 1024 * 1024;
const MAX_MESSAGE_BYTES = 1024 * 1024;
const MAX_TEXT_LENGTH = 100_000;
const MAX_LINES = 2_000;
const MAX_LINE_LENGTH = 1_000;
const MAX_COORDINATE = 1_000_000;

export type ReceiptOcrMessage =
  | { type: 'ready'; id: string }
  | { type: 'error'; id: string; code: 'OCR_FAILED' | 'NO_TEXT' | 'INVALID_IMAGE' }
  | { type: 'result'; id: string; result: ReceiptOcrResult };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateConfidence(value: unknown): number | undefined {
  if (
    value !== undefined &&
    (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)
  ) {
    throw new Error('OCR_FAILED');
  }
  return value;
}

export function validateReceiptOcrDataUrl(dataUrl: string): void {
  if (typeof dataUrl !== 'string') throw new Error('INVALID_IMAGE');
  if (dataUrl.length > MAX_OCR_DATA_URL_LENGTH) throw new Error('IMAGE_TOO_LARGE');
  const prefix = /^data:image\/(?:jpeg|png);base64,/.exec(dataUrl)?.[0];
  const bytes = prefix ? dataUrl.slice(prefix.length) : '';
  if (!bytes || bytes.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(bytes)) {
    throw new Error('INVALID_IMAGE');
  }
}

export function parseReceiptOcrMessage(
  raw: string,
  expectedIds: string[],
  resultId: string | null = expectedIds[0] ?? null,
): ReceiptOcrMessage | null {
  if (raw.length > MAX_MESSAGE_BYTES) throw new Error('OCR_FAILED');
  // RN does not consistently provide TextEncoder. Count UTF-8 bytes before JSON.parse.
  let size = 0;
  for (const character of raw) {
    const point = character.codePointAt(0)!;
    size += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (size > MAX_MESSAGE_BYTES) throw new Error('OCR_FAILED');
  }
  const message: unknown = JSON.parse(raw);
  if (!isRecord(message) || typeof message.id !== 'string') throw new Error('OCR_FAILED');
  if (!expectedIds.includes(message.id)) return null;
  const id = message.id;
  if (message.type === 'ready') return { type: 'ready', id };
  if (message.type === 'error') {
    const code =
      message.code === 'NO_TEXT' || message.code === 'INVALID_IMAGE' ? message.code : 'OCR_FAILED';
    return { type: 'error', id, code };
  }
  if (message.type === 'result' && id !== resultId) return null;
  const result = message.result;
  if (
    message.type !== 'result' ||
    !isRecord(result) ||
    typeof result.text !== 'string' ||
    result.text.length > MAX_TEXT_LENGTH ||
    result.text.includes('\0') ||
    !Array.isArray(result.lines) ||
    result.lines.length > MAX_LINES
  ) {
    throw new Error('OCR_FAILED');
  }
  const confidence = validateConfidence(result.confidence);
  let length = 0;
  const lines: ReceiptOcrResult['lines'] = result.lines.map((line: unknown) => {
    if (
      !isRecord(line) ||
      typeof line.text !== 'string' ||
      line.text.length > MAX_LINE_LENGTH ||
      /[\r\n\u0000]/.test(line.text)
    ) {
      throw new Error('OCR_FAILED');
    }
    length += line.text.length;
    if (length > MAX_TEXT_LENGTH) throw new Error('OCR_FAILED');
    const confidence = validateConfidence(line.confidence);
    const recognizedLine = { text: line.text, ...(confidence === undefined ? {} : { confidence }) };
    if (line.frame === undefined) return recognizedLine;
    const frame = line.frame;
    if (!isRecord(frame)) throw new Error('OCR_FAILED');
    const { left, top, right, bottom } = frame;
    if (
      typeof left !== 'number' ||
      typeof top !== 'number' ||
      typeof right !== 'number' ||
      typeof bottom !== 'number' ||
      ![left, top, right, bottom].every(
        (value) => Number.isFinite(value) && value >= 0 && value <= MAX_COORDINATE,
      ) ||
      right <= left ||
      bottom <= top
    )
      throw new Error('OCR_FAILED');
    return { ...recognizedLine, frame: { left, top, right, bottom } };
  });
  return {
    type: 'result',
    id,
    result: { text: result.text, lines, ...(confidence === undefined ? {} : { confidence }) },
  };
}

export function createReceiptOcrHtml(assets: ReceiptOcrAssets, sessionId: string): string {
  const payload = JSON.stringify({ ...assets, sessionId }).replace(/</g, '\\u003c');
  return `<!doctype html><html><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' blob:; worker-src blob:; img-src data: blob:">
</head><body><script>
(() => {
  const assets = ${payload};
  const noop = () => {};
  for (const method of ['log', 'info', 'warn', 'error', 'debug']) console[method] = noop;
  let activeId = null;
  const send = message => {
    const raw = JSON.stringify(message);
    if (new TextEncoder().encode(raw).byteLength > ${MAX_MESSAGE_BYTES}) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', id: message.id, code: 'OCR_FAILED'}));
      return;
    }
    window.ReactNativeWebView.postMessage(raw);
  };
  const fail = id => send({type: 'error', id, code: 'OCR_FAILED'});
  window.onerror = () => { fail(activeId || assets.sessionId); return true; };
  window.onunhandledrejection = event => { event.preventDefault(); fail(activeId || assets.sessionId); };
  const blobUrl = text => URL.createObjectURL(new Blob([text], {type: 'application/javascript'}));
  const decode = value => Uint8Array.from(atob(value), character => character.charCodeAt(0));
  async function initialize() {
    const mainUrl = blobUrl(assets.main);
    await new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = mainUrl;
      script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
    });
    URL.revokeObjectURL(mainUrl);
    // Tesseract 7 maps Lang.data rather than Lang.code during initialization.
    // Keep the stock worker: serve its single language request from bundled memory.
    const bootstrap = [
      'for (const method of ["log","info","warn","error","debug"]) console[method] = () => {};',
      'const decode = ' + decode.toString() + ';', assets.glue,
      'const coreFactory = TesseractCore;',
      'const wasmBytes = decode(' + JSON.stringify(assets.wasm) + ');',
      'const languageBytes = decode(' + JSON.stringify(assets.language) + ');',
      'self.TesseractCore = options => coreFactory({...options, wasmBinary: wasmBytes, print: () => {}, printErr: () => {}});',
      'self.fetch = async url => { if (String(url) !== "https://cena-ocr.invalid/swe.traineddata.gz") throw new Error("NETWORK_DISABLED"); return new Response(languageBytes); };',
      'self.XMLHttpRequest = class { constructor() { throw new Error("NETWORK_DISABLED"); } };',
      assets.worker,
    ].join('\\n');
    const workerUrl = blobUrl(bootstrap);
    const worker = await Tesseract.createWorker('swe', 1, {
      workerPath: workerUrl, workerBlobURL: false, langPath: 'https://cena-ocr.invalid',
      cacheMethod: 'none', gzip: true, logger: noop, errorHandler: noop,
    });
    // Tesseract's own onerror only rejects its initialization promise.
    const workerFailure = event => {
      event.preventDefault();
      fail(activeId || assets.sessionId);
    };
    worker.worker.addEventListener('error', workerFailure);
    worker.worker.addEventListener('messageerror', workerFailure);
    URL.revokeObjectURL(workerUrl);
    await worker.setParameters({tessedit_pageseg_mode: '6', preserve_interword_spaces: '1'});
    window.cenaRecognize = async packet => {
      if (!packet || typeof packet.id !== 'string' || !/^ocr-\\d+$/.test(packet.id)) return;
      const id = packet.id;
      if (activeId) { fail(id); return; }
      if (typeof packet.dataUrl !== 'string' || packet.dataUrl.length > ${MAX_OCR_DATA_URL_LENGTH} ||
        !/^data:image\\/(?:jpeg|png);base64,/.test(packet.dataUrl)) {
        send({type: 'error', id, code: 'INVALID_IMAGE'}); return;
      }
      activeId = id;
      try {
        const {data} = await worker.recognize(packet.dataUrl, {}, {text: true, blocks: true});
        if (typeof data.text !== 'string' || data.text.length > ${MAX_TEXT_LENGTH}) throw new Error();
        if (!data.text.trim() && !data.blocks?.length) {
          send({type: 'error', id, code: 'NO_TEXT'}); return;
        }
        const lines = [];
        let length = 0;
        for (const block of data.blocks || []) for (const paragraph of block.paragraphs) for (const line of paragraph.lines) {
          if (typeof line.text !== 'string') throw new Error();
          const text = line.text.trim();
          length += text.length;
          if (text.length > ${MAX_LINE_LENGTH} || length > ${MAX_TEXT_LENGTH} || lines.length >= ${MAX_LINES}) throw new Error();
          const {x0, y0, x1, y1} = line.bbox;
          lines.push({text, frame: {left: x0, top: y0, right: x1, bottom: y1}, confidence: line.confidence});
        }
        send({type: 'result', id, result: {text: data.text, lines, confidence: data.confidence}});
      } catch { fail(id); }
      finally { packet.dataUrl = null; activeId = null; }
    };
    send({type: 'ready', id: assets.sessionId});
  }
  initialize().catch(() => fail(assets.sessionId));
})();
</script></body></html>`;
}
