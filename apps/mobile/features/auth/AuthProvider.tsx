import type { Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
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
  requestCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  resendCode(email: string): Promise<void>;
  retryBootstrap(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) {
        setError('Din inloggning kunde inte återställas. Försök logga in igen.');
        setStatus('signedOut');
      } else if (data.session) void loadProfile(data.session);
      else setStatus('signedOut');
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
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
        requestCode,
        verifyCode,
        resendCode,
        retryBootstrap,
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
