import { GatewayTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import { CloudflareFoodRecognitionProvider } from '../src/food-recognition/cloudflare-food-recognition.provider';

describe('CloudflareFoodRecognitionProvider', () => {
  const originalFetch = global.fetch;
  const originalEnvironment = {
    token: process.env.CLOUDFLARE_API_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    provider: process.env.FOOD_RECOGNITION_PROVIDER,
    model: process.env.FOOD_RECOGNITION_MODEL,
    timeout: process.env.FOOD_RECOGNITION_TIMEOUT_MS,
  };

  beforeEach(() => {
    process.env.CLOUDFLARE_API_TOKEN = 'server-test-token';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'account-id';
    process.env.FOOD_RECOGNITION_PROVIDER = 'cloudflare';
    process.env.FOOD_RECOGNITION_MODEL = '@cf/qwen/qwen3.8-27b';
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    restoreEnvironment('CLOUDFLARE_API_TOKEN', originalEnvironment.token);
    restoreEnvironment('CLOUDFLARE_ACCOUNT_ID', originalEnvironment.accountId);
    restoreEnvironment('FOOD_RECOGNITION_PROVIDER', originalEnvironment.provider);
    restoreEnvironment('FOOD_RECOGNITION_MODEL', originalEnvironment.model);
    restoreEnvironment('FOOD_RECOGNITION_TIMEOUT_MS', originalEnvironment.timeout);
  });

  it('sends a base64 image and constrained JSON request to the configured model', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                items: [
                  {
                    name: 'Pasta',
                    quantity: null,
                    unit: null,
                    description: null,
                    confidence: 'MEDIUM',
                  },
                ],
              }),
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock;
    const provider = new CloudflareFoodRecognitionProvider();

    await expect(
      provider.recognizeFood({ bytes: Buffer.from('food-image'), mimeType: 'image/jpeg' }),
    ).resolves.toEqual({
      items: [
        { name: 'Pasta', quantity: null, unit: null, description: null, confidence: 'MEDIUM' },
      ],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/account-id/ai/v1/chat/completions',
      expect.objectContaining({
        headers: { Authorization: 'Bearer server-test-token', 'Content-Type': 'application/json' },
        body: expect.stringContaining('data:image/jpeg;base64,Zm9vZC1pbWFnZQ=='),
      }),
    );
    const request = jest.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse(request[1]?.body as string).model).toBe(
      '@cf/qwen/qwen3.8-27b',
    );
  });

  it('fails when account configuration is missing', async () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    await expect(
      new CloudflareFoodRecognitionProvider().recognizeFood({
        bytes: Buffer.from('x'),
        mimeType: 'image/png',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('does not fall back when the free provider quota is exhausted', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(
      new CloudflareFoodRecognitionProvider().recognizeFood({
        bytes: Buffer.from('x'),
        mimeType: 'image/png',
      }),
    ).rejects.toMatchObject({ status: 429 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('maps provider timeouts to a recoverable timeout error', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    process.env.FOOD_RECOGNITION_TIMEOUT_MS = '1';
    await expect(
      new CloudflareFoodRecognitionProvider().recognizeFood({
        bytes: Buffer.from('x'),
        mimeType: 'image/png',
      }),
    ).rejects.toMatchObject({
      constructor: GatewayTimeoutException,
      message: 'Bildigenkänningen svarade inte inom 1 sekund. Försök igen.',
    });
  });

  it('keeps a 60 second default budget for image inference', async () => {
    jest.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    global.fetch = jest.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          requestSignal = init?.signal ?? undefined;
          requestSignal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }),
    );
    const pending = new CloudflareFoodRecognitionProvider().recognizeFood({
      bytes: Buffer.from('x'),
      mimeType: 'image/png',
    });
    const timeoutAssertion = expect(pending).rejects.toBeInstanceOf(GatewayTimeoutException);

    await jest.advanceTimersByTimeAsync(59_999);
    expect(requestSignal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await timeoutAssertion;
  });

  it('rejects invalid provider JSON instead of claiming success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{' } }] }),
    });
    await expect(
      new CloudflareFoodRecognitionProvider().recognizeFood({
        bytes: Buffer.from('x'),
        mimeType: 'image/png',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
