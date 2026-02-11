// ============================================
// TabBar — Bottom tab navigation for game panels
//
// Uses local state (not a router) since the game
// is a single screen with internal tab switching.
// ============================================

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TabId } from '../types';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';

interface Tab {
  id: TabId;
  icon: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'businesses', icon: '🏢', label: 'Business' },
  { id: 'upgrades', icon: '⬆️', label: 'Upgrades' },
  { id: 'prestige', icon: '⭐', label: 'Prestige' },
  { id: 'achievements', icon: '🏆', label: 'Awards' },
];

export interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange(tab.id)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text
              style={[styles.tabLabel, isActive && styles.tabLabelActive]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default memo(TabBar);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  tabActive: {
    backgroundColor: Colors.bgCardHover,
    borderColor: Colors.gold,
  },
  tabIcon: {
    fontSize: FontSizes.xl,
  },
  tabLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: FontWeights.medium,
  },
  tabLabelActive: {
    color: Colors.textPrimary,
  },
});
