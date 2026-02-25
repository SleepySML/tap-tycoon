// ============================================
// RewardedAdOverlay — Full-screen rewarded ad modal
//
// Replaces the simulated window.confirm for the
// "Watch Ad for 2× Boost" button.
//
// Flow:
//   1. User taps "Watch Ad for 2× Boost"
//   2. This overlay appears with an ad unit + timer
//   3. Timer counts down from REWARDED_AD_DURATION (15s)
//   4. After timer, "Claim Reward" button appears
//   5. User taps claim → onRewardEarned fires → boost activates
//   6. User can cancel early via X button (no reward)
//
// When AdSense is not configured, shows a placeholder
// ad area with a "Sponsored Content" label so the
// timed reward flow still works for testing.
// ============================================

import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';
import { PUBLISHER_ID, AD_SLOTS, REWARDED_AD_DURATION, isAdsConfigured } from '../config/ads';
import { pushAd } from '../services/ads';

export interface RewardedAdOverlayProps {
  visible: boolean;
  onRewardEarned: () => void;
  onClose: () => void;
}

function RewardedAdOverlay({ visible, onRewardEarned, onClose }: RewardedAdOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(REWARDED_AD_DURATION);
  const [canClaim, setCanClaim] = useState(false);
  const adPushed = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Reset state when overlay opens
  useEffect(() => {
    if (visible) {
      setTimeLeft(REWARDED_AD_DURATION);
      setCanClaim(false);
      adPushed.current = false;

      // Push the ad unit
      if (Platform.OS === 'web') {
        setTimeout(() => {
          if (!adPushed.current) {
            adPushed.current = true;
            pushAd();
          }
        }, 300);
      }
    }
  }, [visible]);

  // Countdown timer
  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanClaim(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  const handleClaim = useCallback(() => {
    onRewardEarned();
    onClose();
  }, [onRewardEarned, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close (X) button - always available */}
          <Pressable style={styles.closeBtn} onPress={handleCancel}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>

          {/* Header */}
          <Text style={styles.title}>Watch to Earn 2× Boost</Text>
          <Text style={styles.subtitle}>
            {canClaim
              ? 'Your reward is ready!'
              : `Watch for ${timeLeft}s to earn your reward`}
          </Text>

          {/* Ad unit area */}
          <View style={styles.adContainer}>
            {Platform.OS === 'web' && isAdsConfigured() ? (
              <div
                style={{
                  width: '100%',
                  minHeight: 250,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ins
                  className="adsbygoogle"
                  style={{
                    display: 'block',
                    width: '100%',
                    minHeight: 250,
                  }}
                  data-ad-client={PUBLISHER_ID}
                  data-ad-slot={AD_SLOTS.rewarded}
                  data-ad-format="auto"
                  data-full-width-responsive="true"
                />
              </div>
            ) : (
              <View style={styles.adPlaceholder}>
                <Text style={styles.adPlaceholderLabel}>Sponsored Content</Text>
                <Text style={styles.adPlaceholderIcon}>📺</Text>
                <Text style={styles.adPlaceholderText}>
                  Ad will appear here
                </Text>
              </View>
            )}
          </View>

          {/* Timer / Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((REWARDED_AD_DURATION - timeLeft) / REWARDED_AD_DURATION) * 100}%`,
                },
              ]}
            />
          </View>

          {/* Action buttons */}
          {canClaim ? (
            <Pressable style={styles.claimBtn} onPress={handleClaim}>
              <Text style={styles.claimBtnText}>Claim 2× Boost!</Text>
            </Pressable>
          ) : (
            <View style={styles.waitingRow}>
              <Text style={styles.timerText}>{timeLeft}s remaining</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default memo(RewardedAdOverlay);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '92%',
    maxWidth: 400,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: FontSizes.lg,
    color: Colors.textMuted,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gold,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  adContainer: {
    width: '100%',
    minHeight: 250,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: Spacing.lg,
  },
  adPlaceholder: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  adPlaceholderLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  adPlaceholderIcon: {
    fontSize: 48,
  },
  adPlaceholderText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  claimBtn: {
    width: '100%',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.greenDark,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  claimBtnText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  waitingRow: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  timerText: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    fontWeight: FontWeights.semibold,
  },
});
