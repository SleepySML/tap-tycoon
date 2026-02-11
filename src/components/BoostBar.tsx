// ============================================
// BoostBar — Shows active 2× boost timer
//
// Only renders when boost is active.
// Re-renders every second via internal timer.
// ============================================

import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGameStore, selectBoostEndTime } from '../store/gameStore';
import { isBoostActive } from '../utils/calculations';
import { formatTimer } from '../utils/format';
import { Colors, Spacing, FontSizes, FontWeights } from '../config/theme';

function BoostBar() {
  const boostEndTime = useGameStore(selectBoostEndTime);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!isBoostActive(boostEndTime)) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const secs = Math.max(
        0,
        Math.floor((boostEndTime - Date.now()) / 1_000),
      );
      setRemaining(secs);
    };

    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [boostEndTime]);

  if (remaining <= 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔥</Text>
      <Text style={styles.text}>2× Boost Active!</Text>
      <Text style={styles.timer}>{formatTimer(remaining)}</Text>
    </View>
  );
}

export default memo(BoostBar);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,215,0,0.2)',
  },
  icon: {
    fontSize: FontSizes.md,
  },
  text: {
    fontSize: FontSizes.sm,
    color: Colors.gold,
    fontWeight: FontWeights.semibold,
  },
  timer: {
    fontSize: FontSizes.sm,
    color: Colors.gold,
    fontWeight: FontWeights.bold,
  },
});
