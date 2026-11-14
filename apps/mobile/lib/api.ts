import type { CurrentUser } from '@cena/contracts';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

export class ApiRequestError extends Error {
  constructor(
    readonly reason: 'configuration' | 'network' | 'unauthorized' | 'http',
    readonly status?: number,
    readonly apiMessage?: string,
  ) {
    super(reason);
  }
}

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

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  requestFetch: typeof fetch = fetch,
): Promise<T> {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiBaseUrl) throw new ApiRequestError('configuration');

  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session) throw new ApiRequestError('unauthorized', 401);

  let response: Response;
  try {
    const isJsonBody = typeof init.body === 'string';
    response = await requestFetch(`${apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });
  } catch {
    throw new ApiRequestError('network');
  }

  if (!response.ok) {
    let apiMessage: string | undefined;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'message' in body) {
        const message = body.message;
        apiMessage =
          typeof message === 'string'
            ? message
            : Array.isArray(message)
              ? message.join(' ')
              : undefined;
      }
    } catch {
      apiMessage = undefined;
    }
    throw new ApiRequestError(
      response.status === 401 ? 'unauthorized' : 'http',
      response.status,
      apiMessage,
    );
  }

  if (
    response.status === 204 ||
    response.status === 205 ||
    init.method?.toUpperCase() === 'DELETE'
  ) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiRequestError)) return fallback;
  if (error.status === 413) return 'Bilden är för stor. Välj en mindre bild och försök igen.';
  if (error.apiMessage) return error.apiMessage;
  if (error.reason === 'configuration') return 'API-adressen saknas i appens konfiguration.';
  if (error.reason === 'network')
    return 'Det gick inte att nå Cena API:t. Kontrollera att appens API-adress kan nås från telefonen.';
  if (error.reason === 'unauthorized') return 'Din inloggning har gått ut. Logga in igen.';
  if (error.status === 429) return 'Du har gjort många bildförsök. Försök igen senare.';
  if (error.status === 503)
    return 'Bildigenkänningen är tillfälligt otillgänglig. Försök igen senare eller lägg till varorna manuellt.';
  if (error.status === 504) return 'Bildigenkänningen tog för lång tid. Försök igen.';
  return 'Något gick fel. Försök igen.';
}
