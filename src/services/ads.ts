// ============================================
// BASEMENT TYCOON — Ad Service
//
// Manages Google AdSense ad lifecycle on web.
// All functions are no-ops on native platforms.
//
// AdSense integration approach:
//   - The AdSense script is loaded dynamically only in production
//     (see ensureAdSenseScript). This avoids ERR_BLOCKED_BY_CLIENT
//     in development when an ad blocker is active.
//   - Banner/rectangle ads are rendered as React components
//     that inject <ins class="adsbygoogle"> into the DOM
//   - This service provides helpers to push ads and
//     track interstitial cooldowns
// ============================================

import { Platform } from 'react-native';
import { INTERSTITIAL_COOLDOWN, ADS_ENABLED, PUBLISHER_ID } from '../config/ads';

// ---- Types ----

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

// ---- State ----

let lastInterstitialTime = 0;
let scriptLoadAttempted = false;

// ---- Public API ----

/**
 * Load the AdSense script only in production. In development we skip loading
 * so that ad blockers don't trigger ERR_BLOCKED_BY_CLIENT in the console.
 * Call once when the first ad component mounts (e.g. BannerAd).
 */
export function ensureAdSenseScript(): void {
  if (Platform.OS !== 'web' || !ADS_ENABLED || typeof document === 'undefined') return;

  const isProduction =
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return; // Do not request the script in development — avoids ad-blocker console errors
  }

  if (scriptLoadAttempted) return;
  scriptLoadAttempted = true;

  const existing = document.querySelector('script[src*="adsbygoogle"]');
  if (existing) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
  script.crossOrigin = 'anonymous';
  script.onerror = () => {
    // Ad blocker or network error — avoid follow-up errors; pushAd() will no-op safely
  };
  document.head.appendChild(script);
}

/**
 * Check if the AdSense script has loaded.
 */
export function isAdSenseLoaded(): boolean {
  if (Platform.OS !== 'web') return false;
  return typeof window !== 'undefined' && Array.isArray(window.adsbygoogle);
}

/**
 * Push an ad unit to render. Called after an <ins> element
 * is inserted into the DOM.
 *
 * This is safe to call even if AdSense hasn't loaded yet —
 * it will queue the push and AdSense processes it when ready.
 */
export function pushAd(): void {
  if (Platform.OS !== 'web' || !ADS_ENABLED) return;

  try {
    if (typeof window !== 'undefined') {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  } catch (e) {
    // Silently fail — ad blocker or script not loaded
    console.warn('Ad push failed:', e);
  }
}

/**
 * Check if enough time has passed since the last interstitial.
 */
export function canShowInterstitial(): boolean {
  const now = Date.now() / 1000;
  return now - lastInterstitialTime >= INTERSTITIAL_COOLDOWN;
}

/**
 * Record that an interstitial was shown (resets cooldown).
 */
export function markInterstitialShown(): void {
  lastInterstitialTime = Date.now() / 1000;
}
