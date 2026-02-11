// ============================================
// AchievementCard — A single achievement row
// ============================================

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Achievement } from '../types';
import { formatMoney } from '../utils/format';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';

export interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
}

function AchievementCard({ achievement, unlocked }: AchievementCardProps) {
  return (
    <View style={[styles.card, unlocked ? styles.cardUnlocked : styles.cardLocked]}>
      <View style={[styles.icon, unlocked && styles.iconUnlocked]}>
        <Text style={styles.iconText}>
          {unlocked ? achievement.icon : '🔒'}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{achievement.name}</Text>
        <Text style={styles.desc}>{achievement.description}</Text>
        {achievement.reward > 0 && (
          <Text style={styles.reward}>
            Reward: {formatMoney(achievement.reward)}
          </Text>
        )}
      </View>

      {unlocked && <Text style={styles.check}>✅</Text>}
    </View>
  );
}

export default memo(AchievementCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  cardUnlocked: {
    borderColor: Colors.borderGold,
    backgroundColor: 'rgba(255,215,0,0.03)',
  },
  cardLocked: {
    opacity: 0.5,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.bgGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  iconUnlocked: {
    borderColor: Colors.borderGold,
  },
  iconText: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  desc: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  reward: {
    fontSize: FontSizes.sm,
    color: Colors.gold,
    marginTop: 2,
  },
  check: {
    fontSize: FontSizes.xl,
  },
});
