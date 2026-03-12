// ============================================
// TapButton — Main tap area with floating "+$X" particles
//
// Design decisions:
//   - Uses Pressable (not TouchableOpacity) for native press states
//   - Floating numbers use Animated API (lightweight, sufficient
//     for simple fade+translate since particles don't need UI-thread
//     animation — they're non-interactive decorations)
//   - Particles stored in local state (not global store) since
//     they're purely visual and ephemeral
//   - Haptic feedback via expo-haptics (configurable)
// ============================================

import React, { memo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';
import { useGameStore } from '../store/gameStore';
import { formatMoney } from '../utils/format';

interface Particle {
  id: number;
  value: number;
  x: number;
  opacity: Animated.Value;
  translateY: Animated.Value;
}

let particleId = 0;

function TapButton() {
  const tap = useGameStore((s) => s.tap);
  const [particles, setParticles] = useState<Particle[]>([]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onTap = useCallback(() => {
    const value = tap();

    // Haptic feedback (mobile only)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Spawn floating particle
    const id = ++particleId;
    const opacity = new Animated.Value(1);
    const translateY = new Animated.Value(0);
    const x = (Math.random() - 0.5) * 80;

    const particle: Particle = { id, value, x, opacity, translateY };
    setParticles((prev) => [...prev.slice(-8), particle]); // keep max 9 particles

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -80,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    });
  }, [tap, scaleAnim]);

  return (
    <View style={styles.container}>
      {/* Floating particles */}
      {particles.map((p) => (
        <Animated.Text
          key={p.id}
          style={[
            styles.particle,
            {
              opacity: p.opacity,
              transform: [{ translateY: p.translateY }, { translateX: p.x }],
            },
          ]}
        >
          +{formatMoney(p.value)}
        </Animated.Text>
      ))}

      {/* Tap button */}
      <Pressable onPress={onTap} style={styles.pressable}>
        <Animated.View
          style={[styles.button, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={styles.coin}>
            <Text style={styles.coinSymbol}>$</Text>
          </View>
        </Animated.View>
      </Pressable>

      <Text style={styles.hint}>Tap to earn!</Text>
    </View>
  );
}

export default memo(TapButton);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 120,
    position: 'relative',
  },
  pressable: {
    zIndex: 5,
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  coin: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinSymbol: {
    fontSize: 34,
    fontWeight: FontWeights.extrabold,
    color: '#5a4a0a',
  },
  particle: {
    position: 'absolute',
    top: 20,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.extrabold,
    color: Colors.gold,
    zIndex: 10,
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  hint: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
});
