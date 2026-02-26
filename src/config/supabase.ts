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
//   2. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY below (new API keys)
//   3. Run the SQL schema from supabase/schema.sql
//   4. Enable Google provider in Auth → Providers
//   5. Add your app URLs to Auth → URL Configuration → Redirect URLs (e.g. http://localhost:19006 for web)
//
// API keys (new model): use publishable key in client only.
// - Publishable key (sb_publishable_...): safe for browser/mobile; use here.
// - Secret key (sb_secret_...): backend only (Edge Functions, servers). Never put in client code.
// ============================================

import { Platform, AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// From Supabase Dashboard → Project Settings → API (or Connect) → use new API keys
// - Project URL: e.g. https://xxxx.supabase.co
// - Publishable key: sb_publishable_... (replaces legacy anon key)
const SUPABASE_URL = 'https://bvaxjrydahaeaxvlnbct.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'YOUR_PUBLISHABLE_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
    Boolean(SUPABASE_PUBLISHABLE_KEY && !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_PUBLISHABLE_KEY'))
  );
}
