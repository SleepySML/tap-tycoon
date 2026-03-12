// ============================================
// Header — Money display + stat pills + user info
//
// Performance: subscribes to money, income, tap value,
// and prestige separately via Zustand selectors.
// Only the MoneyText re-renders on every tick.
//
// Since login is now mandatory, the header always shows
// the user's display name/avatar as informational only.
// ============================================

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';
import { useGameStore, selectMoney, selectPrestigePoints } from '../store/gameStore';
import {
  useAuthStore,
  selectDisplayName,
  selectAvatarUrl,
} from '../store/authStore';
import * as Calc from '../utils/calculations';
import { formatMoney } from '../utils/format';

// --- Money display (re-renders on every tick) ---
const MoneyText = memo(function MoneyText() {
  const money = useGameStore(selectMoney);
  return <Text style={styles.moneyValue}>{formatMoney(money)}</Text>;
});

// --- Income pill (re-renders only when income changes) ---
const IncomePill = memo(function IncomePill() {
  const state = useGameStore();
  const ips = Calc.calculateIncomePerSecond(state);
  return (
    <View style={styles.pill}>
      <Text style={styles.pillIcon}>⚡</Text>
      <Text style={styles.pillText}>{formatMoney(ips * 60)}/min</Text>
    </View>
  );
});

// --- Tap value pill ---
const TapPill = memo(function TapPill() {
  const state = useGameStore();
  const tapVal = Calc.calculateTapValue(state);
  return (
    <View style={styles.pill}>
      <Text style={styles.pillIcon}>👆</Text>
      <Text style={styles.pillText}>{formatMoney(tapVal)}/tap</Text>
    </View>
  );
});

// --- Prestige pill ---
const PrestigePill = memo(function PrestigePill() {
  const pp = useGameStore(selectPrestigePoints);
  const mult = Calc.getPrestigeMultiplier(pp);
  return (
    <View style={[styles.pill, styles.prestigePill]}>
      <Text style={styles.pillIcon}>⭐</Text>
      <Text style={[styles.pillText, styles.prestigeText]}>
        {mult.toFixed(1)}x
      </Text>
    </View>
  );
});

// --- User badge (informational, always shown since login is required) ---
const UserBadge = memo(function UserBadge() {
  const name = useAuthStore(selectDisplayName);
  const avatar = useAuthStore(selectAvatarUrl);

  return (
    <View style={styles.profileBtn}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
});

export interface HeaderProps {
  onSettingsPress: () => void;
  onStatsPress: () => void;
}

function Header({ onSettingsPress, onStatsPress }: HeaderProps) {
  return (
    <View style={styles.container}>
      {/* Top row: money + action buttons */}
      <View style={styles.topRow}>
        <View style={styles.moneySection}>
          <Text style={styles.label}>BALANCE</Text>
          <MoneyText />
        </View>
        <View style={styles.actions}>
          <UserBadge />
          <Text style={styles.iconBtn} onPress={onSettingsPress}>
            ⚙️
          </Text>
          <Text style={styles.iconBtn} onPress={onStatsPress}>
            📊
          </Text>
        </View>
      </View>

      {/* Stat pills */}
      <View style={styles.pillRow}>
        <IncomePill />
        <TapPill />
        <PrestigePill />
      </View>
    </View>
  );
}

export default memo(Header);

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bgGlass,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGlass,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontWeight: FontWeights.medium,
  },
  moneyValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.extrabold,
    color: Colors.gold,
  },
  moneySection: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBtn: {
    fontSize: FontSizes.xl,
    padding: Spacing.xs,
  },
  profileBtn: {
    padding: Spacing.xxs,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.purpleDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.purple,
  },
  avatarInitial: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  pillIcon: {
    fontSize: FontSizes.sm,
  },
  pillText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.semibold,
  },
  prestigePill: {
    borderColor: Colors.borderPurple,
  },
  prestigeText: {
    color: Colors.purple,
  },
});
