// ============================================
// TAP TYCOON — Ad Configuration
//
// Centralized configuration for Google AdSense ads.
//
// To activate real ads:
//   1. Create a Google AdSense account at adsense.google.com
//   2. Replace PUBLISHER_ID with your ca-pub-XXXX ID
//   3. Create ad units in AdSense dashboard and
//      replace the slot IDs below
//   4. Deploy — ads start showing once AdSense approves
//
// Ad slot types:
//   - Banner: persistent 320×100 at bottom of game screen
//   - Rewarded: 336×280 rectangle shown in a timed overlay
//   - Interstitial: full-screen ad at natural break points
// ============================================

import { Platform } from 'react-native';

// ---- Publisher Configuration ----

/**
 * Your Google AdSense publisher ID.
 * Replace with your real ID from adsense.google.com.
 * Format: ca-pub-XXXXXXXXXXXXXXXX
 */
export const PUBLISHER_ID = 'ca-pub-7610075308812167';

/**
 * Ad unit slot IDs created in the AdSense dashboard.
 * Each slot corresponds to a specific ad placement.
 * Replace with your real slot IDs after creating them.
 */
export const AD_SLOTS = {
  banner: '8888135845',
  rewarded: '7595235477',
  interstitial: '3456789012',
} as const;

// ---- Feature Flags ----

/** Whether ads are enabled. Set to false during development. */
export const ADS_ENABLED = Platform.OS === 'web';

/** Whether the publisher ID has been configured (not a placeholder). */
export function isAdsConfigured(): boolean {
  return (
    ADS_ENABLED &&
    PUBLISHER_ID !== 'ca-pub-XXXXXXXXXXXXXXXX' &&
    PUBLISHER_ID.startsWith('ca-pub-')
  );
}

// ---- Rewarded Ad Settings ----

/** How long the user must watch the rewarded ad overlay (seconds). */
export const REWARDED_AD_DURATION = 15;

// ---- Interstitial Settings ----

/** Minimum seconds between interstitial ads (prevent spam). */
export const INTERSTITIAL_COOLDOWN = 120;
