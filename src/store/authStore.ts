// ============================================
// BASEMENT TYCOON — Auth Store (Zustand)
//
// Separate store from game state because:
//   - Auth state changes rarely (sign in/out) vs game
//     state changing 10x/sec — different update frequencies
//   - Auth persistence is handled by Supabase SDK or local service
//   - Keeps game store clean and focused
//
// The store accepts both Supabase Session objects and
// local auth session objects. The minimal shape it needs:
//   session.user.id, session.user.is_anonymous, session.user.user_metadata
// ============================================

import { create } from 'zustand';

/** Minimal user shape accepted by the store (Supabase User or LocalUser). */
export interface AuthUser {
  id: string;
  is_anonymous?: boolean;
  user_metadata?: Record<string, any>;
}

/** Minimal session shape accepted by the store (Supabase Session or LocalSession). */
export interface AuthSession {
  user: AuthUser;
  [key: string]: any;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setInitialized: () => set({ isInitialized: true, isLoading: false }),
}));

// ---- Derived Selectors ----

export const selectUser = (s: AuthState) => s.user;
export const selectIsLoading = (s: AuthState) => s.isLoading;
export const selectIsInitialized = (s: AuthState) => s.isInitialized;

/** True if user has a real account (not anonymous, not null). */
export const selectIsAuthenticated = (s: AuthState) =>
  s.user != null && !s.user.is_anonymous;

/** True if user is anonymous (auto-created, no linked identity). */
export const selectIsAnonymous = (s: AuthState) =>
  s.user?.is_anonymous === true;

/** Display name from Google/email metadata, or 'Guest'. */
export const selectDisplayName = (s: AuthState): string => {
  if (!s.user) return 'Guest';
  const meta = s.user.user_metadata;
  return meta?.full_name || meta?.name || meta?.email?.split('@')[0] || 'Player';
};

/** Avatar URL from Google, or null. */
export const selectAvatarUrl = (s: AuthState): string | null => {
  return s.user?.user_metadata?.avatar_url ?? null;
};
