// ============================================
// TAP TYCOON — Supabase Client
//
// Decision: Supabase over Firebase/Auth0/custom:
//   - 50K MAU free (unlimited email/Google auth)
//   - PostgreSQL for cloud saves + leaderboards
//   - Row-Level Security (players only access own data)
//   - Open-source (can self-host if costs grow)
//   - Unlimited API requests on free tier
//
// Setup:
//   1. Create project at https://supabase.com
//   2. Replace the URL and anon key below
//   3. Run the SQL schema from supabase/schema.sql
//   4. Enable Google provider in Auth → Providers
// ============================================

import { Platform, AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ⚠️ Replace these with your Supabase project credentials
// Get them from: https://supabase.com/dashboard/project/_/settings/api
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // On mobile, use AsyncStorage; on web, use built-in localStorage
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    // Must be false for React Native to prevent URL detection issues
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Auto-refresh tokens when app returns to foreground (mobile only).
// Ensures onAuthStateChange fires TOKEN_REFRESHED or SIGNED_OUT
// if the session expired while backgrounded.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

/** Check if Supabase is configured (not placeholder values). */
export function isSupabaseConfigured(): boolean {
  return (
    !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
  );
}
