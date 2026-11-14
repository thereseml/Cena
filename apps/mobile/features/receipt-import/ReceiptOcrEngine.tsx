import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { loadReceiptOcrAssets } from './receipt-ocr-assets';
import {
  createReceiptOcrHtml,
  parseReceiptOcrMessage,
  validateReceiptOcrDataUrl,
} from './receipt-ocr-html';
import type { ReceiptOcrResult } from './receipt-parser';

export interface ReceiptOcrEngineHandle {
  recognize(dataUrl: string): Promise<ReceiptOcrResult>;
  cancel(): void;
}

interface PendingRequest {
  id: string;
  dataUrl: string | null;
  resolve: (result: ReceiptOcrResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

type FailureCode = 'OCR_FAILED' | 'OCR_CANCELLED' | 'OCR_UNAVAILABLE' | 'NO_TEXT' | 'INVALID_IMAGE';

export function ReceiptOcrEngine({ ref }: { ref?: Ref<ReceiptOcrEngineHandle> }) {
  const webView = useRef<WebView<unknown>>(null);
  const mounted = useRef(true);
  const sequence = useRef(0);
  const session = useRef<{ id: string; ready: boolean } | null>(null);
  const pending = useRef<PendingRequest | null>(null);
  const [source, setSource] = useState<{ html: string; sessionId: string } | null>(null);

  function reset(code: FailureCode): void {
    session.current = null;
    const request = pending.current;
    pending.current = null;
    if (request) {
      request.dataUrl = null;
      clearTimeout(request.timer);
      request.reject(new Error(code));
    }
    // Removing the native WebView also kills a worker stuck BEFORE createWorker resolves.
    if (mounted.current) setSource(null);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      reset('OCR_CANCELLED');
    };
  }, []);

  function sendRequest(): void {
    const request = pending.current;
    if (!request?.dataUrl || !session.current?.ready) return;
    try {
      if (!webView.current) throw new Error();
      const packet = JSON.stringify({ id: request.id, dataUrl: request.dataUrl }).replace(
        /</g,
        '\\u003c',
      );
      request.dataUrl = null;
      webView.current.injectJavaScript(`window.cenaRecognize(${packet});true;`);
    } catch {
      reset('OCR_FAILED');
    }
  }

  function recognize(dataUrl: string): Promise<ReceiptOcrResult> {
    if (!mounted.current) return Promise.reject(new Error('OCR_CANCELLED'));
    if (Platform.OS !== 'ios' && Platform.OS !== 'android')
      return Promise.reject(new Error('OCR_UNAVAILABLE'));
    if (pending.current) return Promise.reject(new Error('OCR_FAILED'));
    try {
      validateReceiptOcrDataUrl(dataUrl);
    } catch (error) {
      const code =
        error instanceof Error && error.message === 'IMAGE_TOO_LARGE'
          ? 'IMAGE_TOO_LARGE'
          : 'INVALID_IMAGE';
      return Promise.reject(new Error(code));
    }
    const id = `ocr-${++sequence.current}`;
    return new Promise((resolve, reject) => {
      pending.current = {
        id,
        dataUrl,
        resolve,
        reject,
        timer: setTimeout(() => {
          if (pending.current?.id === id) reset('OCR_FAILED');
        }, 120_000),
      };
      // Asset-loading closures must not retain a cancelled image through this parameter.
      dataUrl = '';
      if (session.current) {
        sendRequest();
        return;
      }
      session.current = { id, ready: false };
      void loadReceiptOcrAssets()
        .then((assets) => {
          if (!mounted.current || session.current?.id !== id) return;
          setSource({ html: createReceiptOcrHtml(assets, id), sessionId: id });
        })
        .catch(() => {
          if (mounted.current && session.current?.id === id) reset('OCR_UNAVAILABLE');
        });
    });
  }

  useImperativeHandle(ref, () => ({ recognize, cancel: () => reset('OCR_CANCELLED') }));

  function receive(event: WebViewMessageEvent, sessionId: string): void {
    if (session.current?.id !== sessionId) return;
    try {
      const request = pending.current;
      const message = parseReceiptOcrMessage(
        event.nativeEvent.data,
        [sessionId, ...(request ? [request.id] : [])],
        request?.id ?? null,
      );
      if (!message) return;
      if (message.type === 'ready') {
        if (message.id !== sessionId || session.current.ready) return;
        session.current.ready = true;
        sendRequest();
        return;
      }
      if (message.type === 'error') {
        reset(message.code);
        return;
      }
      if (!request || message.id !== request.id || request.dataUrl !== null) return;
      if (!message.result.text.trim() && !message.result.lines.some((line) => line.text.trim())) {
        reset('NO_TEXT');
        return;
      }
      pending.current = null;
      clearTimeout(request.timer);
      request.resolve(message.result);
    } catch {
      reset('OCR_FAILED');
    }
  }

  if (!source) return null;
  const fail = () => {
    if (session.current?.id === source.sessionId) reset('OCR_FAILED');
  };
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.hidden}
    >
      <WebView<unknown>
        key={source.sessionId}
        ref={webView}
        source={{ html: source.html }}
        style={styles.hidden}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        originWhitelist={['about:blank']}
        onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
        javaScriptEnabled
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        cacheEnabled={false}
        incognito
        scrollEnabled={false}
        onMessage={(event) => receive(event, source.sessionId)}
        onError={fail}
        onHttpError={fail}
        onContentProcessDidTerminate={fail}
        onRenderProcessGone={fail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
});
