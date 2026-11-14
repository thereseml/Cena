import { apiErrorMessage, apiRequest, ApiRequestError } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({ getSupabaseClient: jest.fn() }));

const getSupabaseClientMock = jest.mocked(getSupabaseClient);

describe('authenticated inventory API requests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api/v1/';
    getSupabaseClientMock.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { access_token: 'access-token' } },
          error: null,
        }),
      },
    } as never);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses the household route and current Supabase bearer token', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });

    await expect(apiRequest('households/household-id/inventory')).resolves.toEqual([]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/households/household-id/inventory',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('sends JSON mutations and surfaces server messages', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ message: 'Varan har ändrats. Läs in den igen innan du sparar.' }),
    });

    await expect(
      apiRequest('households/household-id/inventory/item-id', {
        method: 'PATCH',
        body: JSON.stringify({ expectedVersion: 1 }),
      }),
    ).rejects.toMatchObject({
      reason: 'http',
      status: 409,
      apiMessage: 'Varan har ändrats. Läs in den igen innan du sparar.',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('preserves the idempotency header on add requests', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 'item' }) });

    await apiRequest('households/household-id/inventory', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'mobile:test:request-key' },
      body: JSON.stringify({ name: 'Mjölk' }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'mobile:test:request-key' }),
      }),
    );
  });

  it('sends multipart photo uploads with auth without overriding the generated boundary', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [] }) });
    const form = new FormData();
    form.append('image', 'photo');

    await apiRequest('uploads', { method: 'POST', body: form });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/uploads',
      expect.objectContaining({
        headers: expect.not.objectContaining({ 'Content-Type': 'application/json' }),
        body: form,
      }),
    );
  });

  it('uses an explicit transport when native file uploads require the Expo fetch adapter', async () => {
    const nativeFetch = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [] }) });
    global.fetch = jest.fn();
    const form = new FormData();
    form.append('image', 'photo');

    await apiRequest(
      'uploads',
      { method: 'POST', body: form },
      nativeFetch as unknown as typeof fetch,
    );

    expect(nativeFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/uploads',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
        body: form,
      }),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not treat a native file body as JSON solely because it is not web FormData', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const nativeFileBody = { getParts: () => [] } as unknown as BodyInit;

    await apiRequest('uploads', { method: 'POST', body: nativeFileBody });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('accepts an empty successful DELETE response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: jest.fn() });

    await expect(
      apiRequest<void>('households/household-id/inventory/item-id', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('uses Swedish recovery copy for an oversized image response', () => {
    expect(apiErrorMessage(new ApiRequestError('http', 413, 'File too large'), 'Fel')).toMatch(
      /Bilden är för stor/,
    );
  });

  it('rejects an expired session before sending an API request', async () => {
    getSupabaseClientMock.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }) },
    } as never);
    global.fetch = jest.fn();

    await expect(apiRequest('households/household-id/inventory')).rejects.toBeInstanceOf(
      ApiRequestError,
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(apiErrorMessage(new ApiRequestError('unauthorized', 401), 'Fel')).toMatch(/inloggning/);
  });
});
