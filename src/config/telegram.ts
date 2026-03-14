// ============================================
// BASEMENT TYCOON — Telegram Mini App SDK
//
// Provides:
//   - Type definitions for window.Telegram.WebApp
//   - Detection helpers (isTelegramMiniApp)
//   - UI initialization (expand, theme colors)
//
// The Telegram WebApp script is injected automatically
// by Telegram when the game opens as a Mini App.
// No manual script loading is needed for Mini App context.
//
// Setup (one-time):
//   1. Create a bot via @BotFather
//   2. /newapp → set the Mini App URL to https://500-dollar-game.vercel.app/
//   3. Add TELEGRAM_BOT_TOKEN and TELEGRAM_USERS_SECRET
//      to Supabase Edge Function secrets
// ============================================

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  /** Open a Telegram Stars payment invoice. Status: 'paid' | 'cancelled' | 'failed' | 'pending' */
  openInvoice: (url: string, callback: (status: string) => void) => void;
}

/** Price of the 2× Boost in Telegram Stars (XTR). */
export const STARS_BOOST_PRICE = 2;

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

/** True if the app is running inside a Telegram Mini App. */
export function isTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  // Primary: Telegram SDK injects initData when opened as Mini App
  if (window.Telegram?.WebApp?.initData) return true;
  // Fallback: Telegram appends #tgWebAppData to the URL hash
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return hash.includes('tgWebAppData') || search.includes('tgWebAppData');
}

/** Returns the raw initData string for server-side HMAC verification. */
export function getTelegramInitData(): string | null {
  if (!isTelegramMiniApp()) return null;
  // Prefer SDK-provided initData; fall back to extracting from URL hash
  if (window.Telegram?.WebApp?.initData) return window.Telegram.WebApp.initData;
  const hash = window.location.hash.slice(1); // strip leading #
  const params = new URLSearchParams(hash);
  return params.get('tgWebAppData');
}

/**
 * Returns the Telegram user from initDataUnsafe.
 * NOT verified — use only for display purposes.
 * For auth, always verify via the Edge Function.
 */
export function getTelegramUserUnsafe(): TelegramUser | null {
  if (!isTelegramMiniApp()) return null;
  return window.Telegram!.WebApp!.initDataUnsafe.user ?? null;
}

/**
 * Initialize Telegram Mini App UI.
 * Call once when the app mounts inside Telegram:
 *   - Signals the app is ready (hides the loading indicator)
 *   - Expands to full screen
 *   - Sets theme colors to match the game's dark palette
 */
export function initTelegramMiniApp(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  tg.ready();
  tg.expand();

  try {
    tg.setBackgroundColor('#0a0a1a');
    tg.setHeaderColor('#0a0a1a');
  } catch {
    // Older Telegram versions may not support color overrides
  }
}
