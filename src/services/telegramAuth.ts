// ============================================
// BASEMENT TYCOON — Telegram Auth Service
//
// Calls the Supabase Edge Function `telegram-auth`
// to exchange Telegram's initData for a Supabase session.
//
// Why an Edge Function instead of client-side verification?
//   Telegram's HMAC requires the bot token as the secret key.
//   The bot token must NEVER be exposed to the client.
//   Server-side validation is the only secure approach.
//
// Flow:
//   1. Client sends initData (signed by Telegram) to the Edge Function
//   2. Edge Function verifies HMAC-SHA256 using bot token
//   3. Edge Function creates/fetches Supabase user for the Telegram ID
//   4. Edge Function returns access_token + refresh_token
//   5. Client calls supabase.auth.setSession() with returned tokens
// ============================================

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/telegram-auth`;

export interface TelegramAuthSession {
  access_token: string;
  refresh_token: string;
}

/**
 * Exchange Telegram Mini App initData for a Supabase session.
 * The initData is verified server-side via HMAC-SHA256.
 * Returns Supabase access + refresh tokens on success.
 */
export async function signInWithTelegramInitData(
  initData: string,
): Promise<TelegramAuthSession> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ type: 'mini_app', initData }),
  });

  if (!response.ok) {
    let message = `Telegram auth failed (${response.status})`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  const data = await response.json();

  if (!data.access_token || !data.refresh_token) {
    throw new Error('Invalid response from Telegram auth service');
  }

  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

/**
 * Set a Supabase session from Telegram auth tokens.
 * Call this after signInWithTelegramInitData.
 */
export async function applyTelegramSession(
  session: TelegramAuthSession,
): Promise<void> {
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error) {
    throw new Error(`Failed to apply Telegram session: ${error.message}`);
  }
}
