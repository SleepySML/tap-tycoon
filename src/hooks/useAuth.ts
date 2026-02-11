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

// Required for web browser auth session to complete properly
WebBrowser.maybeCompleteAuthSession();

/** Redirect URI for OAuth callbacks. */
const redirectTo = makeRedirectUri();

/**
 * Initialize auth: restore session, listen for changes.
 * Call once at app root.
 *
 * When Supabase is configured: restores Supabase session, subscribes to changes.
 * When not configured: initializes local auth (seeds test accounts), restores local session.
 */
export function useAuthInit(): void {
  const { setSession, setInitialized } = useAuthStore();

  useEffect(() => {
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

    // Supabase mode — restore existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized();
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          return { error: error.message };
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
  };
}

// ---- Helpers ----

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
