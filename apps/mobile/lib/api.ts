import type { CurrentUser } from '@cena/contracts';
import type { Session } from '@supabase/supabase-js';

export class ProfileBootstrapError extends Error {
  constructor(
    readonly reason: 'configuration' | 'network' | 'unauthorized' | 'http',
    readonly status?: number,
  ) {
    super(reason);
  }
}

export async function bootstrapProfile(session: Session): Promise<CurrentUser> {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiBaseUrl) throw new ProfileBootstrapError('configuration');

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/me/bootstrap`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        Accept: 'application/json',
      },
    });
  } catch {
    throw new ProfileBootstrapError('network');
  }

  if (response.status === 401) {
    throw new ProfileBootstrapError('unauthorized', response.status);
  }
  if (!response.ok) throw new ProfileBootstrapError('http', response.status);
  return (await response.json()) as CurrentUser;
}
