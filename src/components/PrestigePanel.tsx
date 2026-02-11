// ============================================
// PrestigePanel — Prestige info, reset button, and
//                 prestige upgrades list
// ============================================

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { PRESTIGE_UPGRADES } from '../config/upgrades';
import { GAME } from '../config/constants';
import * as Calc from '../utils/calculations';
import { formatMoney } from '../utils/format';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';
import UpgradeCard from './UpgradeCard';

function PrestigePanel() {
  const state = useGameStore();
  const prestige = useGameStore((s) => s.prestige);
  const buyPrestigeUpgrade = useGameStore((s) => s.buyPrestigeUpgrade);

  const prestigePoints = state.prestigePoints;
  const multiplier = Calc.getPrestigeMultiplier(prestigePoints);
  const earnable = Calc.calculatePrestigeEarnable(state.totalEarned);
  const canPrestige = earnable > 0;

  const handlePrestige = useCallback(() => {
    Alert.alert(
      'Prestige?',
      `You will earn ${earnable} prestige point(s).\nAll businesses and upgrades will be reset.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Prestige',
          style: 'destructive',
          onPress: () => prestige(),
        },
      ],
    );
  }, [earnable, prestige]);

  return (
    <View style={styles.container}>
      {/* Prestige info card */}
      <View style={styles.card}>
        <Text style={styles.gem}>💎</Text>
        <Text style={styles.desc}>
          Reset your progress to earn{' '}
          <Text style={styles.bold}>Prestige Points</Text>
        </Text>
        <Text style={styles.detail}>
          Each point gives a permanent{' '}
          <Text style={styles.bold}>+5% income multiplier</Text>
        </Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Current Points</Text>
          <Text style={styles.statValue}>{prestigePoints}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Current Multiplier</Text>
          <Text style={styles.statValue}>{multiplier.toFixed(2)}×</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Points on Reset</Text>
          <Text style={[styles.statValue, styles.statHighlight]}>
            {earnable}
          </Text>
        </View>

        <Pressable
          style={[styles.prestigeBtn, !canPrestige && styles.prestigeBtnDisabled]}
          onPress={handlePrestige}
          disabled={!canPrestige}
        >
          <Text style={styles.prestigeBtnText}>⭐ Prestige Now</Text>
        </Pressable>

        <Text style={styles.req}>
          {canPrestige
            ? `You will earn ${earnable} prestige points!`
            : `Earn ${formatMoney(GAME.PRESTIGE_THRESHOLD)} total to unlock`}
        </Text>
      </View>

      {/* Prestige upgrades */}
      <Text style={styles.sectionTitle}>Prestige Upgrades</Text>
      {PRESTIGE_UPGRADES.map((up) => {
        const owned = state.prestigeUpgrades.includes(up.id);
        const canAfford = prestigePoints >= up.cost;
        return (
          <UpgradeCard
            key={up.id}
            icon={up.icon}
            name={up.name}
            description={up.description}
            costLabel={`${up.cost} PP`}
            owned={owned}
            canAfford={canAfford}
            onBuy={() => buyPrestigeUpgrade(up.id)}
          />
        );
      })}
    </View>
  );
}

export default memo(PrestigePanel);

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.lg,
  },
  card: {
    backgroundColor: 'rgba(179,136,255,0.08)',
    borderWidth: 1,
    borderColor: Colors.borderPurple,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  gem: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  desc: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  detail: {
    fontSize: FontSizes.sm,
    color: Colors.purple,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  bold: {
    fontWeight: FontWeights.bold,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    marginTop: Spacing.md,
  },
  statLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.purple,
  },
  statHighlight: {
    color: Colors.gold,
    fontSize: FontSizes.lg,
  },
  prestigeBtn: {
    width: '100%',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.purpleDark,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  prestigeBtnDisabled: {
    opacity: 0.4,
  },
  prestigeBtnText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  req: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
});
