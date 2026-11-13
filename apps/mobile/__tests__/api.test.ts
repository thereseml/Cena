import type { Session } from '@supabase/supabase-js';
import { bootstrapProfile, ProfileBootstrapError } from '../lib/api';

const session = { access_token: 'test-token' } as Session;

describe('bootstrapProfile', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('identifies network failures separately', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    await expect(bootstrapProfile(session)).rejects.toMatchObject({
      name: 'Error',
      reason: 'network',
    });
  });

  it('identifies rejected sessions with their HTTP status', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

    await expect(bootstrapProfile(session)).rejects.toMatchObject({
      name: 'Error',
      reason: 'unauthorized',
      status: 401,
    });
    await expect(bootstrapProfile(session)).rejects.toBeInstanceOf(ProfileBootstrapError);
  });

  it('preserves unexpected API status codes for troubleshooting', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(bootstrapProfile(session)).rejects.toMatchObject({
      reason: 'http',
      status: 500,
    });
  });
});
