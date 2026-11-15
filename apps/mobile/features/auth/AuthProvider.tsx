import type { Session } from '@supabase/supabase-js';
import { AppState, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import type { CurrentUser } from '@cena/contracts';
import { bootstrapProfile, ProfileBootstrapError } from '../../lib/api';
import { getSupabaseClient } from '../../lib/supabase';

type AuthStatus = 'initializing' | 'signedOut' | 'loadingProfile' | 'authenticated' | 'error';
interface AuthContextValue {
  status: AuthStatus;
  profile: CurrentUser | null;
  error: string | null;
  hasSession: boolean;
  invitationReady: boolean;
  invitationToken: string | null;
  requestCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  resendCode(email: string): Promise<void>;
  retryBootstrap(): Promise<void>;
  setProfileFromServer(profile: CurrentUser): void;
  clearInvitation(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const INVITATION_STORAGE_KEY = 'pending-household-invitation';
const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function AuthProvider({ children }: PropsWithChildren) {
  const [startupError] = useState<string | null>(() => {
    try {
      getSupabaseClient();
      return null;
    } catch {
      return 'Appen saknar Supabase-konfiguration. Kontakta den som ansvarar för testet.';
    }
  });
  const [status, setStatus] = useState<AuthStatus>(startupError ? 'error' : 'initializing');
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(startupError);
  const [session, setSession] = useState<Session | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationReady, setInvitationReady] = useState(false);
  const profileRequestId = useRef(0);

  async function loadProfile(nextSession: Session): Promise<void> {
    const requestId = ++profileRequestId.current;
    setSession(nextSession);
    setStatus('loadingProfile');
    setError(null);
    try {
      const currentUser = await bootstrapProfile(nextSession);
      if (requestId !== profileRequestId.current) return;
      setProfile(currentUser);
      setStatus('authenticated');
    } catch (bootstrapError) {
      if (requestId !== profileRequestId.current) return;
      setProfile(null);
      if (!(bootstrapError instanceof ProfileBootstrapError)) {
        setError('Cena kunde inte läsa in din profil. Försök igen.');
      } else if (bootstrapError.reason === 'configuration') {
        setError('API-adressen saknas i appens konfiguration.');
      } else if (bootstrapError.reason === 'network') {
        setError(
          'Vi kunde inte nå API:t. Kontrollera att det körs och att adressen fungerar från enheten.',
        );
      } else if (bootstrapError.reason === 'unauthorized') {
        setError(
          'API:t avvisade Supabase-sessionen (401). Kontrollera projektets aktiva JWT-nyckel.',
        );
      } else {
        setError(
          `API:t svarade med ett fel (HTTP ${bootstrapError.status}). Kontrollera API-loggen.`,
        );
      }
      setStatus('error');
    }
  }

  useEffect(() => {
    if (startupError) return;
    let mounted = true;
    const client = getSupabaseClient();

    async function storeInvitationUrl(url: string): Promise<void> {
      try {
        const parsedUrl = new URL(url);
        const token = parsedUrl.searchParams.get('token');
        if (!token || !INVITATION_TOKEN_PATTERN.test(token)) return;
        await SecureStore.setItemAsync(INVITATION_STORAGE_KEY, token).catch(() => undefined);
        if (mounted) setInvitationToken(token);
      } catch {
        // Ignore unrelated or malformed links without logging their contents.
      }
    }

    const linkListener = Linking.addEventListener('url', ({ url }) => {
      void storeInvitationUrl(url);
    });

    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted || event === 'INITIAL_SESSION') return;
      if (event === 'TOKEN_REFRESHED' && nextSession) {
        setSession(nextSession);
        return;
      }
      if (nextSession) void loadProfile(nextSession);
      else {
        profileRequestId.current += 1;
        setSession(null);
        setProfile(null);
        setError(null);
        setStatus('signedOut');
      }
    });
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') void client.auth.startAutoRefresh();

    void (async () => {
      const [savedToken, initialUrl] = await Promise.all([
        SecureStore.getItemAsync(INVITATION_STORAGE_KEY).catch(() => null),
        Linking.getInitialURL().catch(() => null),
      ]);
      if (!mounted) return;
      const token = savedToken && INVITATION_TOKEN_PATTERN.test(savedToken) ? savedToken : null;
      if (token) setInvitationToken(token);
      if (initialUrl) await storeInvitationUrl(initialUrl);
      setInvitationReady(true);
      const { data, error: sessionError } = await client.auth.getSession();
      if (!mounted) return;
      if (sessionError) {
        setError('Din inloggning kunde inte återställas. Försök logga in igen.');
        setStatus('signedOut');
      } else if (data.session) void loadProfile(data.session);
      else setStatus('signedOut');
    })();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      linkListener.remove();
      appStateListener.remove();
      void client.auth.stopAutoRefresh();
    };
  }, [startupError]);

  async function requestCode(email: string): Promise<void> {
    const { error: requestError } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (requestError?.status === 429) {
      throw new Error('För många försök. Vänta en stund innan du begär en ny kod.');
    }
    if (requestError)
      throw new Error('Koden kunde inte skickas. Kontrollera adressen och försök igen.');
  }

  async function verifyCode(email: string, code: string): Promise<void> {
    const { data, error: verificationError } = await getSupabaseClient().auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    if (verificationError || !data.session) throw new Error('Koden är felaktig eller har gått ut.');
    // The SIGNED_IN auth event performs the single profile bootstrap.
  }

  async function resendCode(email: string): Promise<void> {
    await requestCode(email);
  }

  async function retryBootstrap(): Promise<void> {
    if (session) await loadProfile(session);
  }

  function setProfileFromServer(currentUser: CurrentUser): void {
    setProfile(currentUser);
    setStatus('authenticated');
  }

  async function clearInvitation(): Promise<void> {
    setInvitationToken(null);
    await SecureStore.deleteItemAsync(INVITATION_STORAGE_KEY).catch(() => undefined);
  }

  async function signOut(): Promise<void> {
    const { error: signOutError } = await getSupabaseClient().auth.signOut();
    if (signOutError) throw new Error('Du kunde inte loggas ut. Försök igen.');
    profileRequestId.current += 1;
    setSession(null);
    setProfile(null);
    setStatus('signedOut');
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        profile,
        error,
        hasSession: session !== null,
        invitationReady,
        invitationToken,
        requestCode,
        verifyCode,
        resendCode,
        retryBootstrap,
        setProfileFromServer,
        clearInvitation,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
