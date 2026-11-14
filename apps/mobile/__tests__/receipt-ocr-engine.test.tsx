import { createRef } from 'react';
import { act, render } from '@testing-library/react-native';
import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import {
  ReceiptOcrEngine,
  type ReceiptOcrEngineHandle,
} from '../features/receipt-import/ReceiptOcrEngine';
import { loadReceiptOcrAssets } from '../features/receipt-import/receipt-ocr-assets';
import type { ReceiptOcrResult } from '../features/receipt-import/receipt-parser';

const mockInject = jest.fn();
let mockProps: WebViewProps;
jest.mock(
  'react-native-webview',
  () => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return {
      WebView: React.forwardRef(function MockWebView(props: WebViewProps, ref) {
        mockProps = props;
        React.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
        return <View testID="ocr-webview" />;
      }),
    };
  },
  { virtual: true },
);
jest.mock('../features/receipt-import/receipt-ocr-assets', () => ({
  loadReceiptOcrAssets: jest.fn(),
}));

const loader = jest.mocked(loadReceiptOcrAssets);
const assets = { main: 'main', worker: 'worker', glue: 'glue', wasm: 'AA==', language: 'AA==' };
const image = 'data:image/jpeg;base64,/9j/';
const result: ReceiptOcrResult = {
  text: 'MJÖLK 16,90',
  lines: [{ text: 'MJÖLK 16,90', frame: { left: 2, top: 4, right: 120, bottom: 24 } }],
};

beforeEach(() => {
  jest.clearAllMocks();
  loader.mockResolvedValue(assets);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function recognize(ref: React.RefObject<ReceiptOcrEngineHandle | null>) {
  let promise!: Promise<ReceiptOcrResult>;
  await act(async () => {
    promise = ref.current!.recognize(image);
    void promise.catch(() => undefined);
  });
  return { promise };
}

async function message(value: unknown, callback = mockProps.onMessage) {
  await act(async () =>
    callback?.({ nativeEvent: { data: JSON.stringify(value) } } as WebViewMessageEvent),
  );
}

function injectedId(): string {
  const command: string = mockInject.mock.calls.at(-1)![0];
  const packet = JSON.parse(command.slice('window.cenaRecognize('.length, -');true;'.length)) as {
    id: string;
  };
  return packet.id;
}

it('loads lazily, is inert/hidden, blocks navigation and file access, and reuses one session', async () => {
  const ref = createRef<ReceiptOcrEngineHandle>();
  const screen = await render(<ReceiptOcrEngine ref={ref} />);
  expect(screen.queryByTestId('ocr-webview')).toBeNull();
  expect(loader).not.toHaveBeenCalled();
  const first = await recognize(ref);
  expect(mockInject).not.toHaveBeenCalled();
  expect(mockProps).toMatchObject({
    accessible: false,
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
    allowFileAccess: false,
    allowFileAccessFromFileURLs: false,
    allowUniversalAccessFromFileURLs: false,
    mixedContentMode: 'never',
    incognito: true,
    sharedCookiesEnabled: false,
    thirdPartyCookiesEnabled: false,
    javaScriptCanOpenWindowsAutomatically: false,
    cacheEnabled: false,
  });
  const navigation = mockProps.onShouldStartLoadWithRequest!;
  expect(navigation({ url: 'about:blank' } as never)).toBe(true);
  for (const url of [
    'file:///private/receipt.jpg',
    'https://example.com',
    'javascript:alert(1)',
    'about:blank#link',
  ]) {
    expect(navigation({ url } as never)).toBe(false);
  }
  const source = mockProps.source;
  await message({ type: 'ready', id: 'ocr-1' });
  expect(mockInject).toHaveBeenCalledTimes(1);
  await message({ type: 'result', id: injectedId(), result });
  await expect(first.promise).resolves.toEqual(result);
  const second = await recognize(ref);
  expect(loader).toHaveBeenCalledTimes(1);
  expect(mockProps.source).toEqual(source);
  expect(mockInject).toHaveBeenCalledTimes(2);
  expect(injectedId()).toBe('ocr-2');
  await message({ type: 'result', id: 'ocr-2', result });
  await expect(second.promise).resolves.toEqual(result);
});

it('rejects overlap without interrupting the active request and ignores stale IDs', async () => {
  const ref = createRef<ReceiptOcrEngineHandle>();
  await render(<ReceiptOcrEngine ref={ref} />);
  const first = await recognize(ref);
  await expect(ref.current!.recognize(image)).rejects.toThrow('OCR_FAILED');
  await message({ type: 'ready', id: 'ocr-1' });
  await message({ type: 'result', id: 'ocr-1', result });
  await expect(first.promise).resolves.toEqual(result);
  const second = await recognize(ref);
  await message({ type: 'result', id: 'ocr-1', result: null });
  await message({ type: 'ready', id: 'ocr-1' });
  expect(mockInject).toHaveBeenCalledTimes(2);
  await message({ type: 'result', id: 'ocr-2', result });
  await expect(second.promise).resolves.toEqual(result);
  const third = await recognize(ref);
  await message({ type: 'error', id: 'ocr-2', code: 'NO_TEXT' });
  await message({ type: 'result', id: 'ocr-2', result: null });
  await message({ type: 'result', id: 'ocr-3', result });
  await expect(third.promise).resolves.toEqual(result);
});

it.each(['active', 'idle'] as const)(
  'resets a crashed worker while %s and can recover',
  async (phase) => {
    const ref = createRef<ReceiptOcrEngineHandle>();
    const screen = await render(<ReceiptOcrEngine ref={ref} />);
    const first = await recognize(ref);
    await message({ type: 'ready', id: 'ocr-1' });
    await message({ type: 'result', id: 'ocr-1', result });
    await expect(first.promise).resolves.toEqual(result);
    let active: Awaited<ReturnType<typeof recognize>> | undefined;
    if (phase === 'active') active = await recognize(ref);
    const staleMessage = mockProps.onMessage;
    await message({
      type: 'error',
      id: phase === 'active' ? 'ocr-2' : 'ocr-1',
      code: 'OCR_FAILED',
    });
    if (active) await expect(active.promise).rejects.toThrow(/^OCR_FAILED$/);
    expect(screen.queryByTestId('ocr-webview', { includeHiddenElements: true })).toBeNull();
    const next = await recognize(ref);
    const id = phase === 'active' ? 'ocr-3' : 'ocr-2';
    await message({ type: 'error', id: 'ocr-1', code: 'OCR_FAILED' }, staleMessage);
    await message({ type: 'ready', id });
    await message({ type: 'result', id, result });
    await expect(next.promise).resolves.toEqual(result);
    expect(loader).toHaveBeenCalledTimes(2);
  },
);

it('cancels by removing the WebView and ignores callbacks from the removed session', async () => {
  const ref = createRef<ReceiptOcrEngineHandle>();
  const screen = await render(<ReceiptOcrEngine ref={ref} />);
  const first = await recognize(ref);
  const oldMessage = mockProps.onMessage;
  const oldError = mockProps.onError;
  await act(async () => ref.current!.cancel());
  await expect(first.promise).rejects.toThrow('OCR_CANCELLED');
  expect(screen.queryByTestId('ocr-webview', { includeHiddenElements: true })).toBeNull();
  const second = await recognize(ref);
  await message({ type: 'ready', id: 'ocr-1' }, oldMessage);
  await act(async () =>
    oldError?.({ nativeEvent: { description: 'private native details' } } as never),
  );
  expect(mockInject).not.toHaveBeenCalled();
  await message({ type: 'ready', id: 'ocr-2' });
  await message({ type: 'result', id: 'ocr-2', result });
  await expect(second.promise).resolves.toEqual(result);
});

it('does not resurrect cancelled asset loading and sanitizes load failures', async () => {
  let finish!: (value: typeof assets) => void;
  loader.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const ref = createRef<ReceiptOcrEngineHandle>();
  const screen = await render(<ReceiptOcrEngine ref={ref} />);
  const first = await recognize(ref);
  await act(async () => ref.current!.cancel());
  await expect(first.promise).rejects.toThrow('OCR_CANCELLED');
  await act(async () => finish(assets));
  expect(screen.queryByTestId('ocr-webview', { includeHiddenElements: true })).toBeNull();
  loader.mockRejectedValueOnce(new Error('private download details'));
  const second = await recognize(ref);
  await expect(second.promise).rejects.toThrow(/^OCR_UNAVAILABLE$/);
});

it.each(['onError', 'onHttpError', 'onContentProcessDidTerminate', 'onRenderProcessGone'] as const)(
  'resets and rejects safely on %s',
  async (event) => {
    const ref = createRef<ReceiptOcrEngineHandle>();
    const screen = await render(<ReceiptOcrEngine ref={ref} />);
    const request = await recognize(ref);
    await act(async () =>
      mockProps[event]?.({ nativeEvent: { description: 'private error' } } as never),
    );
    await expect(request.promise).rejects.toThrow(/^OCR_FAILED$/);
    expect(screen.queryByTestId('ocr-webview', { includeHiddenElements: true })).toBeNull();
  },
);

it.each(['loading', 'initializing', 'recognizing'] as const)(
  'times out during %s and resets',
  async (phase) => {
    jest.useFakeTimers();
    const timers = jest.spyOn(globalThis, 'setTimeout');
    const cleared = jest.spyOn(globalThis, 'clearTimeout');
    if (phase === 'loading') loader.mockReturnValueOnce(new Promise(() => undefined));
    const ref = createRef<ReceiptOcrEngineHandle>();
    const screen = await render(<ReceiptOcrEngine ref={ref} />);
    const request = await recognize(ref);
    const timeoutIndex = timers.mock.calls.findIndex((call) => call[1] === 120_000);
    const timeout = timers.mock.results[timeoutIndex].value;
    if (phase === 'recognizing') await message({ type: 'ready', id: 'ocr-1' });
    await act(async () => jest.advanceTimersByTime(120_000));
    await expect(request.promise).rejects.toThrow(/^OCR_FAILED$/);
    expect(screen.queryByTestId('ocr-webview', { includeHiddenElements: true })).toBeNull();
    expect(cleared).toHaveBeenCalledWith(timeout);
  },
);

it('cancels on unmount and a retained handle cannot start work afterwards', async () => {
  const ref = createRef<ReceiptOcrEngineHandle>();
  const screen = await render(<ReceiptOcrEngine ref={ref} />);
  const handle = ref.current!;
  const request = await recognize(ref);
  await screen.unmount();
  await expect(request.promise).rejects.toThrow(/^OCR_CANCELLED$/);
  await expect(handle.recognize(image)).rejects.toThrow(/^OCR_CANCELLED$/);
});

it('rejects invalid images without loading assets', async () => {
  const ref = createRef<ReceiptOcrEngineHandle>();
  await render(<ReceiptOcrEngine ref={ref} />);
  await expect(ref.current!.recognize('file:///receipt.jpg')).rejects.toThrow(/^INVALID_IMAGE$/);
  await expect(ref.current!.recognize('x'.repeat(28 * 1024 * 1024 + 1))).rejects.toThrow(
    /^IMAGE_TOO_LARGE$/,
  );
  expect(loader).not.toHaveBeenCalled();
});

it.each([
  [{ type: 'error', id: 'ocr-1', code: 'private details' }, 'OCR_FAILED'],
  [{ type: 'error', id: 'ocr-1', code: 'NO_TEXT' }, 'NO_TEXT'],
  [{ type: 'result', id: 'ocr-1', result: { text: '', lines: [] } }, 'NO_TEXT'],
  [{ type: 'result', id: 'ocr-1', result: { text: 'private text', lines: [null] } }, 'OCR_FAILED'],
])('handles bounded messages without leaking details: %#', async (value, code) => {
  const ref = createRef<ReceiptOcrEngineHandle>();
  const screen = await render(<ReceiptOcrEngine ref={ref} />);
  const request = await recognize(ref);
  await message({ type: 'ready', id: 'ocr-1' });
  await message(value);
  await expect(request.promise).rejects.toThrow(new RegExp(`^${code}$`));
  expect(screen.queryByTestId('ocr-webview', { includeHiddenElements: true })).toBeNull();
});

it.each(['not JSON', 'x'.repeat(1024 * 1024 + 1)])(
  'resets on malformed/oversized bridge messages %#',
  async (raw) => {
    const ref = createRef<ReceiptOcrEngineHandle>();
    const screen = await render(<ReceiptOcrEngine ref={ref} />);
    const request = await recognize(ref);
    await act(async () =>
      mockProps.onMessage?.({ nativeEvent: { data: raw } } as WebViewMessageEvent),
    );
    await expect(request.promise).rejects.toThrow(/^OCR_FAILED$/);
    expect(screen.queryByTestId('ocr-webview', { includeHiddenElements: true })).toBeNull();
  },
);
