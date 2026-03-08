// ============================================
// TAP TYCOON — Auth Hook
//
// Provides all authentication operations:
//   - Initialize session (restore from storage)
//   - Sign in with Google (OAuth via web browser)
//   - Sign in with email/password
//   - Sign up with email/password
//   - Sign out
//
// Auth flow: login-required gate
//   Players must sign in before the game loads.
//   When Supabase is configured, real Supabase auth is used.
//   When Supabase is NOT configured, a local AsyncStorage-
//   backed auth service provides fully functional login/register
//   with pre-seeded test accounts.
//
// Google OAuth: expo-web-browser approach
//   - Works in Expo Go (no dev build needed for testing)
//   - Works on web, iOS, Android from same code
//   - Requires Supabase to be configured (no local fallback)
// ============================================

import { useCallback, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { useAuthStore } from '../store/authStore';
import * as localAuth from '../services/localAuth';
import {
  isTelegramMiniApp,
  getTelegramInitData,
  initTelegramMiniApp,
} from '../config/telegram';
import {
  signInWithTelegramInitData,
  applyTelegramSession,
} from '../services/telegramAuth';

// Required for web browser auth session to complete properly
WebBrowser.maybeCompleteAuthSession();

/** Redirect URI for OAuth callbacks. */
const redirectTo = makeRedirectUri();

/**
 * On web: return the URL Supabase should redirect to after OAuth.
 * Must match Redirect URLs in Supabase Dashboard → Auth → URL Configuration.
 */
function getWebRedirectUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin + (window.location.pathname || '');
}

/**
 * On web: handle OAuth callback (PKCE code exchange or hash params).
 * Returns true if we handled the callback (code or error in URL).
 */
async function handleWebOAuthCallback(
  setSession: (s: any) => void,
  setInitialized: () => void,
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const search = new URLSearchParams(window.location.search);
  const code = search.get('code');

  if (code) {
    try {
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && session) {
        setSession(session);
        if (session.user && !session.user.is_anonymous) {
          ensureProfileForUser(session.user);
        }
      }
      if (error) {
        Alert.alert('Sign In Failed', error.message || 'Could not complete sign in.');
      }
    } catch (err: any) {
      Alert.alert('Sign In Failed', err?.message || 'Could not complete sign in.');
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname || '/');
    }
    setInitialized();
    return true;
  }

  const hashParams = new URLSearchParams((window.location.hash || '#').slice(1));
  const errorDesc = hashParams.get('error_description') || hashParams.get('error');
  if (errorDesc) {
    Alert.alert('Sign In Failed', decodeURIComponent(errorDesc));
    window.history.replaceState({}, document.title, window.location.pathname || '/');
  }

  return false;
}

/**
 * Initialize auth: restore session, listen for changes.
 * Call once at app root.
 *
 * When Supabase is configured: restores Supabase session, subscribes to changes.
 * On web, handles OAuth redirect (PKCE code exchange) before getSession.
 * When not configured: initializes local auth (seeds test accounts), restores local session.
 */
export function useAuthInit(): void {
  const { setSession, setInitialized } = useAuthStore();

  useEffect(() => {
    // Telegram Mini App: initialize UI and auto-authenticate before anything else.
    // When the game opens inside Telegram, the user never sees the auth screen —
    // Telegram's signed initData is exchanged for a Supabase session server-side.
    if (Platform.OS === 'web' && isTelegramMiniApp()) {
      initTelegramMiniApp();

      (async () => {
        try {
          const initData = getTelegramInitData()!;
          const tokens = await signInWithTelegramInitData(initData);
          await applyTelegramSession(tokens);
          // After setSession, fetch the resolved session and push it to the store.
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
          if (session?.user) ensureProfileForUser(session.user);
        } catch (err) {
          console.warn('[TelegramAuth] Auto sign-in failed:', err);
          // Fall through: auth store remains unset → AuthScreen will render
        } finally {
          setInitialized();
        }
      })();
      return;
    }

    if (!isSupabaseConfigured()) {
      // Local auth mode — initialize and restore session
      (async () => {
        try {
          await localAuth.initialize();
          const session = await localAuth.getSession();
          if (session) {
            // Cast to any since local session shape matches what authStore needs
            setSession(session as any);
          }
        } catch (err) {
          // Silently fail — user will see auth screen
          console.warn('Local auth init error:', err);
        } finally {
          setInitialized();
        }
      })();
      return;
    }

    let cancelled = false;

    const initSupabase = async () => {
      // Web: handle OAuth callback first (PKCE code in URL)
      if (Platform.OS === 'web') {
        const handled = await handleWebOAuthCallback(setSession, setInitialized);
        if (handled || cancelled) return;
      }

      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        setSession(session);
        if (session?.user && !session.user.is_anonymous) {
          ensureProfileForUser(session.user);
        }
        setInitialized();
      }
    };

    initSupabase();

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setSession(session);
        if (session?.user && !session.user.is_anonymous) {
          ensureProfileForUser(session.user);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setSession, setInitialized]);
}

/**
 * Auth operations hook.
 * Returns functions for Google, email, and sign-out.
 *
 * When Supabase is not configured, email operations route
 * to localAuth service. Google OAuth shows an alert
 * (requires a real backend).
 */
export function useAuthActions() {
  const setLoading = useAuthStore((s) => s.setLoading);
  const setSession = useAuthStore((s) => s.setSession);

  // ---- Telegram (Mini App initData) ----
  const signInWithTelegram = useCallback(async (): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: 'Telegram sign-in requires Supabase to be configured.' };
    }
    const initData = getTelegramInitData();
    if (!initData) {
      return { error: 'Not running inside a Telegram Mini App.' };
    }
    try {
      setLoading(true);
      const tokens = await signInWithTelegramInitData(initData);
      await applyTelegramSession(tokens);
      return { error: null };
    } catch (err: any) {
      return { error: err.message ?? 'Telegram sign-in failed.' };
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  // ---- Google OAuth ----
  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Google Sign-In Unavailable',
        'Google sign-in requires Supabase to be configured. Please use email/password instead.',
      );
      return;
    }

    try {
      setLoading(true);

      if (Platform.OS === 'web') {
        const redirectTo = getWebRedirectUrl() || window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;

        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectTo,
          );

          if (result.type === 'success' && result.url) {
            await createSessionFromUrl(result.url);
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Could not sign in with Google.');
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  // ---- Email/Password Sign In ----
  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured()) {
        // Route to local auth
        try {
          setLoading(true);
          const session = await localAuth.signIn(email, password);
          setSession(session as any);
          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        } finally {
          setLoading(false);
        }
      }

      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          return { error: error.message };
        }
        if (data.session) {
          setSession(data.session as any);
          if (data.user && !data.user.is_anonymous) {
            ensureProfileForUser(data.user);
          }
        }
        return { error: null };
      } catch (error: any) {
        return { error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setSession],
  );

  // ---- Email/Password Sign Up ----
  const signUpWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured()) {
        // Route to local auth
        try {
          setLoading(true);
          const session = await localAuth.signUp(email, password);
          setSession(session as any);
          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        } finally {
          setLoading(false);
        }
      }

      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          return { error: error.message };
        }
        if (data.session) {
          setSession(data.session as any);
          if (data.user && !data.user.is_anonymous) {
            ensureProfileForUser(data.user);
          }
        }
        if (!data.session) {
          Alert.alert(
            'Check Your Email',
            'We sent a verification link. Please check your inbox.',
          );
        }
        return { error: null };
      } catch (error: any) {
        return { error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setSession],
  );

  // ---- Sign Out ----
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      if (!isSupabaseConfigured()) {
        await localAuth.signOut();
        setSession(null);
      } else {
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setSession]);

  return {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    signInWithTelegram,
  };
}

// ---- Helpers ----

/**
 * Ensure the current user has a row in public.profiles (creates or updates).
 * Called after sign-in/sign-up so the user appears in the profiles table even
 * if the DB trigger didn't run (e.g. trigger not deployed or RLS blocked it).
 */
function ensureProfileForUser(user: { id: string; user_metadata?: Record<string, unknown>; email?: string | null }): void {
  if (!isSupabaseConfigured()) return;
  const displayName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    (user.email ? user.email.split('@')[0] : 'Player') ||
    'Player';
  const avatarUrl = (user.user_metadata?.avatar_url as string) ?? null;
  supabase
    .from('profiles')
    .upsert(
      { id: user.id, display_name: displayName, avatar_url: avatarUrl },
      { onConflict: 'id' }
    )
    .then(({ error }) => {
      if (error) console.warn('ensureProfileForUser:', error.message);
    });
}

/**
 * Extract access/refresh tokens from the OAuth redirect URL
 * and set the Supabase session.
 */
async function createSessionFromUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return;

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) throw error;
}
