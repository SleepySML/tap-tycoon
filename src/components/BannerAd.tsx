// ============================================
// BannerAd — Google AdSense banner ad unit
//
// Renders a 320×100 banner ad at the bottom of the
// game screen. Web-only — renders nothing on native.
//
// How it works:
//   1. On mount, inserts an <ins class="adsbygoogle"> element
//   2. Calls adsbygoogle.push({}) to request an ad fill
//   3. AdSense fills the slot with a real ad (or blank if
//      not yet approved / ad blocker active)
//
// When AdSense is not configured, shows a subtle placeholder
// so the layout stays consistent during development.
// ============================================

import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, FontSizes, Spacing } from '../config/theme';
import { PUBLISHER_ID, AD_SLOTS, ADS_ENABLED, isAdsConfigured } from '../config/ads';
import { pushAd, ensureAdSenseScript } from '../services/ads';

function BannerAd() {
  const adRef = useRef<HTMLDivElement | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !ADS_ENABLED) return;
    ensureAdSenseScript(); // Load script in production only (avoids ERR_BLOCKED_BY_CLIENT in dev)
    if (pushed.current) return;
    pushed.current = true;

    // Small delay to ensure the DOM element is rendered
    const timer = setTimeout(() => {
      pushAd();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Native: render nothing
  if (Platform.OS !== 'web') return null;

  // Web: render AdSense unit or placeholder
  if (!isAdsConfigured()) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Ad Space</Text>
      </View>
    );
  }

  // Real AdSense banner — wrapper keeps layout stable while AdSense fills
  return (
    <View style={styles.container}>
      <View style={styles.adWrapper}>
        <div
          ref={adRef}
          style={{ width: '100%', minHeight: 90 }}
        >
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: 90 }}
            data-ad-client={PUBLISHER_ID}
            data-ad-slot={AD_SLOTS.banner}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </View>
    </View>
  );
}

export default memo(BannerAd);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: Colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: Colors.borderGlass,
  },
  adWrapper: {
    width: '100%',
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  placeholder: {
    width: '100%',
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopWidth: 1,
    borderTopColor: Colors.borderGlass,
  },
  placeholderText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
