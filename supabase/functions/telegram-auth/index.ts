// ============================================
// BASEMENT TYCOON — Telegram Auth Edge Function
//
// Validates Telegram Mini App initData and issues
// a Supabase session for the Telegram user.
//
// Security model:
//   - initData is signed by Telegram using the bot token (HMAC-SHA256)
//   - We verify the signature server-side — the bot token never leaves
//     this Edge Function
//   - Each Telegram user maps to a Supabase user via a stable fake email:
//       tg_{telegram_id}@telegram.tap-tycoon.local
//   - Their password is deterministic: HMAC-SHA256(TELEGRAM_USERS_SECRET, telegram_id)
//     This means the same user always gets the same password without us
//     storing it anywhere, and it cannot be guessed without the secret
//
// Required environment variables (set in Supabase Dashboard → Edge Functions → Secrets):
//   TELEGRAM_BOT_TOKEN     — from @BotFather
//   TELEGRAM_USERS_SECRET  — a random secret you generate once (e.g. openssl rand -hex 32)
//
// Auto-provided by Supabase:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_ANON_KEY
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_USERS_SECRET = Deno.env.get('TELEGRAM_USERS_SECRET')!;

// ---- Crypto helpers ----

const encoder = new TextEncoder();

/** Compute HMAC-SHA256(key_bytes, data_string) → hex string */
async function hmacSha256Hex(keyBytes: ArrayBuffer, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Compute HMAC-SHA256(key_string, data_string) → ArrayBuffer */
async function hmacSha256Raw(keyStr: string, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keyStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

/**
 * Verify Telegram Mini App initData.
 *
 * Algorithm (from Telegram docs):
 *   secret_key = HMAC-SHA256("WebAppData", bot_token)
 *   data_check_string = sorted key=value pairs (excluding hash), joined by \n
 *   expected_hash = HMAC-SHA256(secret_key, data_check_string).hex()
 */
async function verifyInitData(initData: string): Promise<boolean> {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) return false;

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKeyRaw = await hmacSha256Raw('WebAppData', TELEGRAM_BOT_TOKEN);
  const expectedHash = await hmacSha256Hex(secretKeyRaw, dataCheckString);

  return expectedHash === receivedHash;
}

/**
 * Derive a deterministic password for a Telegram user.
 * HMAC-SHA256(TELEGRAM_USERS_SECRET, telegram_id_string)
 */
async function derivePassword(telegramId: number): Promise<string> {
  const keyRaw = await hmacSha256Raw(TELEGRAM_USERS_SECRET, String(telegramId));
  return Array.from(new Uint8Array(keyRaw))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---- Supabase clients ----

/** Admin client — can create users, bypasses RLS. */
function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Anon client — used for signInWithPassword to get real session tokens. */
function getAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---- Core auth logic ----

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

/**
 * Get or create a Supabase user for a Telegram user, then sign them in.
 * Returns access_token + refresh_token on success.
 */
async function getOrCreateSession(
  tgUser: TelegramUser,
): Promise<{ access_token: string; refresh_token: string }> {
  const fakeEmail = `tg_${tgUser.id}@telegram.tap-tycoon.local`;
  const password = await derivePassword(tgUser.id);

  const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
  const userMetadata = {
    telegram_id: tgUser.id,
    full_name: displayName,
    name: displayName,
    avatar_url: tgUser.photo_url ?? null,
    username: tgUser.username ?? null,
    provider: 'telegram',
  };

  const anonClient = getAnonClient();

  // Fast path: try to sign in first (existing user)
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: fakeEmail,
    password,
  });

  if (!signInError && signInData.session) {
    // Update metadata in case name/avatar changed
    const adminClient = getAdminClient();
    await adminClient.auth.admin.updateUserById(signInData.user.id, {
      user_metadata: userMetadata,
    });

    return {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    };
  }

  // User doesn't exist — create them
  const adminClient = getAdminClient();
  const { error: createError } = await adminClient.auth.admin.createUser({
    email: fakeEmail,
    password,
    email_confirm: true, // skip email verification
    user_metadata: userMetadata,
  });

  if (createError) {
    throw new Error(`Failed to create Telegram user: ${createError.message}`);
  }

  // Sign in to get session tokens
  const { data: newSignIn, error: newSignInError } = await anonClient.auth.signInWithPassword({
    email: fakeEmail,
    password,
  });

  if (newSignInError || !newSignIn.session) {
    throw new Error(`Failed to sign in new Telegram user: ${newSignInError?.message}`);
  }

  return {
    access_token: newSignIn.session.access_token,
    refresh_token: newSignIn.session.refresh_token,
  };
}

// ---- Handler ----

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, initData } = body;

    if (type !== 'mini_app') {
      return new Response(
        JSON.stringify({ error: 'Unsupported auth type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!initData || typeof initData !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing initData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify Telegram signature
    const isValid = await verifyInitData(initData);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid Telegram initData signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Parse user from initData
    const params = new URLSearchParams(initData);
    const userJson = params.get('user');
    if (!userJson) {
      return new Response(
        JSON.stringify({ error: 'No user in initData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let tgUser: TelegramUser;
    try {
      tgUser = JSON.parse(userJson);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Malformed user in initData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Issue Supabase session
    const session = await getOrCreateSession(tgUser);

    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[telegram-auth]', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
