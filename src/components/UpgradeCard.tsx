// ============================================
// UpgradeCard — A single upgrade or prestige-upgrade row
//
// Reused for both regular upgrades and prestige upgrades
// by passing different props.
// ============================================

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';

export interface UpgradeCardProps {
  icon: string;
  name: string;
  description: string;
  costLabel: string;
  owned: boolean;
  canAfford: boolean;
  onBuy: () => void;
}

function UpgradeCard({
  icon,
  name,
  description,
  costLabel,
  owned,
  canAfford,
  onBuy,
}: UpgradeCardProps) {
  return (
    <View
      style={[
        styles.card,
        owned && styles.cardOwned,
        !owned && canAfford && styles.cardAffordable,
      ]}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.desc}>{description}</Text>
      </View>

      {owned ? (
        <View style={styles.ownedBadge}>
          <Text style={styles.ownedText}>Owned</Text>
        </View>
      ) : (
        <Pressable
          style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
          onPress={onBuy}
          disabled={!canAfford}
        >
          <Text
            style={[styles.buyText, !canAfford && styles.buyTextDisabled]}
          >
            {costLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default memo(UpgradeCard);

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
  cardOwned: {
    opacity: 0.5,
    borderColor: Colors.green,
  },
  cardAffordable: {
    borderColor: Colors.borderGreen,
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
  buyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.blue,
    borderRadius: Radii.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  buyBtnDisabled: {
    opacity: 0.4,
  },
  buyText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  buyTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
  ownedBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.green,
  },
  ownedText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.green,
  },
});
