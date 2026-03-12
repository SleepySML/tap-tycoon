// ============================================
// BusinessCard — A single business row
//
// Performance: receives all data as props (no store
// subscription inside). The parent list re-renders
// when money or businesses change, and React.memo
// skips cards whose props haven't changed.
// ============================================

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Business } from '../types';
import { formatMoney } from '../utils/format';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';

export interface BusinessCardProps {
  business: Business;
  level: number;
  income: number;        // calculated income/sec for this business
  cost: number;          // cost for the buy action
  costLabel: string;     // formatted cost string (may include "(x5)")
  canAfford: boolean;
  onBuy: () => void;
}

function BusinessCard({
  business,
  level,
  income,
  cost,
  costLabel,
  canAfford,
  onBuy,
}: BusinessCardProps) {
  return (
    <View style={[styles.card, canAfford && level === 0 && styles.cardHighlight]}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>{business.icon}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {business.name}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>
              {level > 0 ? `Lv.${level}` : 'NEW'}
            </Text>
          </View>
        </View>
        <Text style={styles.income}>
          {level > 0 ? `${formatMoney(income * 60)}/min` : business.description}
        </Text>
      </View>

      <Pressable
        style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
        onPress={onBuy}
        disabled={!canAfford}
      >
        <Text
          style={[styles.buyText, !canAfford && styles.buyTextDisabled]}
          numberOfLines={1}
        >
          {costLabel}
        </Text>
      </Pressable>
    </View>
  );
}

export default memo(BusinessCard);

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
  cardHighlight: {
    borderColor: Colors.borderGreen,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Colors.bgGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  iconText: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  levelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    backgroundColor: 'rgba(68,138,255,0.15)',
    borderRadius: Radii.full,
  },
  levelText: {
    fontSize: FontSizes.xs,
    color: Colors.blue,
    fontWeight: FontWeights.semibold,
  },
  income: {
    fontSize: FontSizes.sm,
    color: Colors.green,
    marginTop: 2,
  },
  buyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.greenDark,
    borderRadius: Radii.sm,
    minWidth: 75,
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
});
