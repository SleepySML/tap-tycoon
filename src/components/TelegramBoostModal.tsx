// ============================================
// TelegramBoostModal — Stars payment UI for Telegram Mini App
//
// Shown instead of RewardedAdOverlay when the game runs inside Telegram.
// Telegram Rules §1 forbids ads on Mini App pages — this uses
// Telegram Stars (XTR) as the monetization mechanism instead.
//
// Flow:
//   1. User taps "2× Boost for ⭐ Stars"
//   2. This modal opens, showing the Stars price
//   3. User taps "Pay ⭐ Stars" → Edge Function creates invoice link
//   4. window.Telegram.WebApp.openInvoice() opens the Stars payment sheet
//   5. On status='paid' → boost activates, modal closes
//   6. On status='cancelled'/'failed' → error shown, user can retry
// ============================================

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';
import { STARS_BOOST_PRICE } from '../config/telegram';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/supabase';

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/telegram-stars`;

export interface TelegramBoostModalProps {
  visible: boolean;
  onRewardEarned: () => void;
  onClose: () => void;
}

function TelegramBoostModal({ visible, onRewardEarned, onClose }: TelegramBoostModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = useCallback(async () => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.openInvoice) {
      setError('Stars payments are not available in this version of Telegram. Please update the app.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ask the Edge Function to create a Stars invoice link via Bot API
      const resp = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      const data = await resp.json();

      if (!resp.ok || !data.invoice_url) {
        throw new Error(data.error ?? 'Failed to create invoice');
      }

      // Open the Telegram Stars payment sheet
      tg.openInvoice(data.invoice_url, (status: string) => {
        setLoading(false);
        if (status === 'paid') {
          onRewardEarned();
          onClose();
        } else if (status === 'cancelled') {
          // User cancelled — no error shown, just close the sheet
        } else {
          setError('Payment failed. Please try again.');
        }
      });
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }, [onRewardEarned, onClose]);

  const handleClose = useCallback(() => {
    setError(null);
    setLoading(false);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>

          {/* Icon */}
          <Text style={styles.icon}>⚡</Text>

          {/* Title */}
          <Text style={styles.title}>2× Income Boost</Text>
          <Text style={styles.subtitle}>Double all income for 2 hours</Text>

          {/* Details */}
          <View style={styles.detailBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>2 hours</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Multiplier</Text>
              <Text style={styles.detailValue}>2× all income</Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValueGold}>⭐ {STARS_BOOST_PRICE} Stars</Text>
            </View>
          </View>

          {/* Error message */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Pay button */}
          <Pressable
            style={[styles.payBtn, loading && styles.payBtnDisabled]}
            onPress={handlePay}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.payBtnText}>Pay ⭐ {STARS_BOOST_PRICE} Stars</Text>
            )}
          </Pressable>

          <Text style={styles.note}>
            Powered by Telegram Stars. Secure payment through Telegram.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

export default memo(TelegramBoostModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '92%',
    maxWidth: 380,
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
  },
  closeBtnText: {
    fontSize: FontSizes.lg,
    color: Colors.textMuted,
  },
  icon: {
    fontSize: 48,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  detailBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radii.md,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGlass,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    fontWeight: FontWeights.semibold,
  },
  detailValueGold: {
    fontSize: FontSizes.md,
    color: Colors.gold,
    fontWeight: FontWeights.bold,
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: Radii.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: '#ef4444',
    textAlign: 'center',
  },
  payBtn: {
    width: '100%',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.greenDark,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  payBtnDisabled: {
    opacity: 0.6,
  },
  payBtnText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  note: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
