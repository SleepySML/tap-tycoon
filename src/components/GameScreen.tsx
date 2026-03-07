// ============================================
// GameScreen — Main game screen
//
// Architecture:
//   - Single top-level subscription to the store
//   - Derived data computed via useMemo (only recalculates
//     when dependencies change)
//   - Child components are memoized; only re-render when
//     their specific props change
//   - ScrollView (not FlatList) for panels since lists
//     have ≤20 items — virtualization overhead isn't worth it
//   - Tab switching is local state
//   - Modals (offline, daily) managed via local state flags
// ============================================

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { TabId, BuyAmount } from '../types';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';
import { BUSINESSES } from '../config/businesses';
import { UPGRADES } from '../config/upgrades';
import { ACHIEVEMENTS } from '../config/achievements';
import { DAILY_REWARDS } from '../config/achievements';

import { useGameStore } from '../store/gameStore';
import { useAuthStore, selectDisplayName } from '../store/authStore';
import * as Calc from '../utils/calculations';
import { formatMoney, formatTime, formatNumber } from '../utils/format';
import { useGameLoop } from '../hooks/useGameLoop';
import { useAppState } from '../hooks/useAppState';
import { useCloudSync } from '../hooks/useCloudSync';
import { useAuthActions } from '../hooks/useAuth';

import Header from './Header';
import TapButton from './TapButton';
import TabBar from './TabBar';
import BoostBar from './BoostBar';
import BusinessCard from './BusinessCard';
import UpgradeCard from './UpgradeCard';
import PrestigePanel from './PrestigePanel';
import AchievementCard from './AchievementCard';
import BannerAd from './BannerAd';
import RewardedAdOverlay from './RewardedAdOverlay';

// ---- Buy amount options ----
const BUY_AMOUNTS: BuyAmount[] = [1, 10, 25, 100, 'max'];

export default function GameScreen() {
  // ---- Local UI state ----
  const [activeTab, setActiveTab] = useState<TabId>('businesses');
  const [buyAmountIdx, setBuyAmountIdx] = useState(0);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineAmount, setOfflineAmount] = useState(0);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [achievementToast, setAchievementToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ---- Store subscriptions ----
  const state = useGameStore();
  const displayName = useAuthStore(selectDisplayName);

  // ---- Auth actions ----
  const { signOut } = useAuthActions();

  // ---- Hooks ----
  useAppState();
  useCloudSync();

  const onNewAchievements = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const ach = ACHIEVEMENTS.find((a) => a.id === ids[0]);
    if (ach) {
      setAchievementToast(ach.name);
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setAchievementToast(null), 3000);
    }
  }, []);

  useGameLoop(onNewAchievements);

  // ---- Boot: offline earnings + daily reward ----
  const hasBooted = useRef(false);
  useEffect(() => {
    if (hasBooted.current) return;
    hasBooted.current = true;

    state.incrementSession();

    // Offline earnings
    const earnings = state.applyOfflineEarnings();
    if (earnings > 0) {
      setOfflineAmount(earnings);
      setShowOfflineModal(true);
    }

    // Daily reward (delayed to not overlap)
    setTimeout(() => {
      if (Calc.canClaimDaily(state.lastDailyDate)) {
        setShowDailyModal(true);
      }
    }, earnings > 0 ? 500 : 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Derived data ----
  const buyAmount = BUY_AMOUNTS[buyAmountIdx];
  const buyLabel = buyAmount === 'max' ? 'Buy MAX' : `Buy ×${buyAmount}`;

  const businessData = useMemo(() => {
    return BUSINESSES.map((biz) => {
      const level = state.businesses[biz.id] ?? 0;
      const income = Calc.calculateBusinessIncome(state, biz.id);

      let amount: number;
      if (buyAmount === 'max') {
        amount = Math.max(1, Calc.calculateMaxAffordable(state, biz.id));
      } else {
        amount = buyAmount;
      }

      const cost = Calc.calculateBusinessCost(state, biz.id, amount);
      const canAfford = state.money >= cost;

      let costLabel: string;
      if (buyAmount === 'max') {
        const maxAff = Calc.calculateMaxAffordable(state, biz.id);
        if (maxAff > 0) {
          costLabel = `${formatMoney(Calc.calculateBusinessCost(state, biz.id, maxAff))} (×${maxAff})`;
        } else {
          costLabel = formatMoney(Calc.calculateBusinessCost(state, biz.id, 1));
        }
      } else {
        costLabel = formatMoney(cost);
      }

      return { biz, level, income, cost, costLabel, canAfford, amount };
    });
  }, [state.money, state.businesses, state.upgrades, state.prestigeUpgrades, state.prestigePoints, state.boostEndTime, buyAmount]);

  // ---- Handlers ----
  const handleBuyBusiness = useCallback(
    (bizId: string, amount: number) => {
      const actualAmount =
        BUY_AMOUNTS[buyAmountIdx] === 'max'
          ? Math.max(1, Calc.calculateMaxAffordable(useGameStore.getState(), bizId))
          : amount;
      state.buyBusiness(bizId, actualAmount);
    },
    [buyAmountIdx, state.buyBusiness],
  );

  const cycleBuyAmount = useCallback(() => {
    setBuyAmountIdx((prev) => (prev + 1) % BUY_AMOUNTS.length);
  }, []);

  const handleClaimDaily = useCallback(() => {
    state.claimDaily();
    setShowDailyModal(false);
  }, [state.claimDaily]);

  const handleBoost = useCallback(() => {
    // Open the rewarded ad overlay (real ad + timer)
    setShowRewardedAd(true);
  }, []);

  const handleRewardEarned = useCallback(() => {
    state.activateBoost();
  }, [state.activateBoost]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Game?',
      'This will delete ALL progress. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => state.resetAll() },
      ],
    );
  }, [state.resetAll]);

  // ---- Render helpers ----
  const renderBusinessPanel = () => (
    <View>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Your Businesses</Text>
        <Pressable style={styles.buyAmountBtn} onPress={cycleBuyAmount}>
          <Text style={styles.buyAmountText}>{buyLabel}</Text>
        </Pressable>
      </View>
      {businessData.map((d) => (
        <BusinessCard
          key={d.biz.id}
          business={d.biz}
          level={d.level}
          income={d.income}
          cost={d.cost}
          costLabel={d.costLabel}
          canAfford={d.canAfford}
          onBuy={() => handleBuyBusiness(d.biz.id, d.amount)}
        />
      ))}
    </View>
  );

  const renderUpgradePanel = () => {
    const visibleUpgrades = UPGRADES.filter(
      (up) =>
        state.upgrades.includes(up.id) ||
        Calc.isUpgradeUnlocked(state, up.id),
    );

    return (
      <View>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Upgrades</Text>
        </View>
        {visibleUpgrades.map((up) => {
          const owned = state.upgrades.includes(up.id);
          const canAfford = state.money >= up.cost;
          return (
            <UpgradeCard
              key={up.id}
              icon={up.icon}
              name={up.name}
              description={up.description}
              costLabel={formatMoney(up.cost)}
              owned={owned}
              canAfford={canAfford}
              onBuy={() => state.buyUpgrade(up.id)}
            />
          );
        })}
        {visibleUpgrades.length === 0 && (
          <Text style={styles.emptyText}>
            Keep tapping and growing to unlock upgrades!
          </Text>
        )}
      </View>
    );
  };

  const renderAchievementPanel = () => {
    const sorted = [...ACHIEVEMENTS].sort((a, b) => {
      const aU = state.achievements.includes(a.id);
      const bU = state.achievements.includes(b.id);
      if (aU && !bU) return -1;
      if (!aU && bU) return 1;
      return 0;
    });

    return (
      <View>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Achievements</Text>
          <Text style={styles.countText}>
            {state.achievements.length}/{ACHIEVEMENTS.length}
          </Text>
        </View>
        {sorted.map((ach) => (
          <AchievementCard
            key={ach.id}
            achievement={ach}
            unlocked={state.achievements.includes(ach.id)}
          />
        ))}
      </View>
    );
  };

  // ---- Stats panel content ----
  const statsContent = useMemo(() => {
    const ownedCount = Object.values(state.businesses).filter((l) => l > 0).length;
    return [
      ['Total Earned', formatMoney(state.totalEarned)],
      ['Total Taps', formatNumber(state.totalTaps)],
      ['Prestiges', String(state.totalPrestiges)],
      ['Businesses', String(ownedCount)],
      ['Upgrades', String(state.upgrades.length)],
      ['Achievements', `${state.achievements.length}/${ACHIEVEMENTS.length}`],
      ['Time Played', formatTime(state.timePlayed)],
      ['Sessions', String(state.sessions)],
    ];
  }, [state.totalEarned, state.totalTaps, state.totalPrestiges, state.businesses, state.upgrades, state.achievements, state.timePlayed, state.sessions]);

  // ---- Main Render ----
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Header
          onSettingsPress={() => setShowSettings(true)}
          onStatsPress={() => setShowStats(true)}
        />

        <BoostBar />

        <TapButton />

        {/* Watch Ad Boost Button */}
        <View style={styles.boostBtnRow}>
          <Pressable style={styles.boostBtn} onPress={handleBoost}>
            <View style={styles.adIcon}>
              <Text style={styles.adIconText}>▶</Text>
            </View>
            <Text style={styles.boostBtnText}>Watch Ad for 2× Boost</Text>
          </Pressable>
        </View>

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'businesses' && renderBusinessPanel()}
          {activeTab === 'upgrades' && renderUpgradePanel()}
          {activeTab === 'prestige' && <PrestigePanel />}
          {activeTab === 'achievements' && renderAchievementPanel()}
        </ScrollView>

        {/* Banner Ad at bottom of game area */}
        <BannerAd />
      </View>

      {/* Achievement Toast */}
      {achievementToast && (
        <View style={styles.toast}>
          <Text style={styles.toastIcon}>🏆</Text>
          <View>
            <Text style={styles.toastLabel}>Achievement Unlocked!</Text>
            <Text style={styles.toastName}>{achievementToast}</Text>
          </View>
        </View>
      )}

      {/* Offline Earnings Modal */}
      <Modal visible={showOfflineModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>🌙</Text>
            <Text style={styles.modalTitle}>Welcome Back!</Text>
            <Text style={styles.modalDesc}>
              While you were away, your businesses earned:
            </Text>
            <Text style={styles.modalAmount}>
              {formatMoney(offlineAmount)}
            </Text>
            <Pressable
              style={styles.modalBtn}
              onPress={() => setShowOfflineModal(false)}
            >
              <Text style={styles.modalBtnText}>Collect</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Daily Reward Modal */}
      <Modal visible={showDailyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>🎁</Text>
            <Text style={styles.modalTitle}>Daily Reward!</Text>
            <Text style={styles.modalDesc}>
              Day {Calc.getDailyDay(state.dailyStreak)} Streak
            </Text>
            <View style={styles.dailyGrid}>
              {DAILY_REWARDS.map((r) => {
                const day = r.day;
                const currentDay = Calc.getDailyDay(state.dailyStreak);
                const claimed = day < currentDay;
                const isCurrent = day === currentDay;
                return (
                  <View
                    key={day}
                    style={[
                      styles.dailyItem,
                      claimed && styles.dailyClaimed,
                      isCurrent && styles.dailyCurrent,
                    ]}
                  >
                    <Text style={styles.dailyDayText}>Day {day}</Text>
                    <Text style={styles.dailyIcon}>{r.icon}</Text>
                  </View>
                );
              })}
            </View>
            <Pressable style={styles.modalBtn} onPress={handleClaimDaily}>
              <Text style={styles.modalBtnText}>Claim Reward</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.sidePanelOverlay}>
          <Pressable
            style={styles.sidePanelBackdrop}
            onPress={() => setShowSettings(false)}
          />
          <View style={styles.sidePanel}>
            <View style={styles.sidePanelHeader}>
              <Text style={styles.sidePanelTitle}>Settings</Text>
              <Pressable onPress={() => setShowSettings(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.sidePanelBody}>
              {/* Account section (always signed in — login is required) */}
              <Text style={styles.settingSectionTitle}>Account</Text>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Signed in as</Text>
                <Text style={styles.settingValue}>{displayName}</Text>
              </View>
              <Pressable
                style={styles.settingBtn}
                onPress={() => {
                  setShowSettings(false);
                  signOut();
                }}
              >
                <Text style={styles.settingBtnText}>Sign Out</Text>
              </Pressable>

              <View style={styles.settingDivider} />

              {/* Danger zone */}
              <Pressable style={styles.settingBtn} onPress={handleReset}>
                <Text style={styles.settingBtnDanger}>🗑️ Reset Game</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Stats Modal */}
      <Modal visible={showStats} transparent animationType="slide">
        <View style={styles.sidePanelOverlay}>
          <Pressable
            style={styles.sidePanelBackdrop}
            onPress={() => setShowStats(false)}
          />
          <View style={styles.sidePanel}>
            <View style={styles.sidePanelHeader}>
              <Text style={styles.sidePanelTitle}>Statistics</Text>
              <Pressable onPress={() => setShowStats(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.sidePanelBody}>
              {statsContent.map(([label, value]) => (
                <View key={label} style={styles.statRow}>
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={styles.statValue}>{value}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rewarded Ad Overlay */}
      <RewardedAdOverlay
        visible={showRewardedAd}
        onRewardEarned={handleRewardEarned}
        onClose={() => setShowRewardedAd(false)}
      />

    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  container: {
    flex: 1,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  tabContent: {
    flex: 1,
    minHeight: 0, // Required on web: prevents flex child from growing beyond its container
  },
  tabContentInner: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  panelTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  countText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  buyAmountBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  buyAmountText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    paddingVertical: Spacing.xxxl,
  },

  // Boost button
  boostBtnRow: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  boostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  adIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adIconText: {
    fontSize: 8,
    color: Colors.bgPrimary,
    fontWeight: FontWeights.bold,
  },
  boostBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gold,
  },

  // Achievement toast
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderGold,
    zIndex: 9999,
  },
  toastIcon: {
    fontSize: 24,
  },
  toastLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gold,
    fontWeight: FontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toastName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalDesc: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalAmount: {
    fontSize: FontSizes.hero,
    fontWeight: FontWeights.extrabold,
    color: Colors.gold,
    marginVertical: Spacing.lg,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.greenDark,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  modalBtnText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },

  // Daily grid
  dailyGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  dailyItem: {
    width: 44,
    height: 52,
    borderRadius: Radii.sm,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyClaimed: {
    borderColor: Colors.green,
  },
  dailyCurrent: {
    borderColor: Colors.gold,
  },
  dailyDayText: {
    fontSize: 8,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  dailyIcon: {
    fontSize: 18,
  },

  // Side panels (settings/stats)
  sidePanelOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  sidePanelBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidePanel: {
    width: 300,
    backgroundColor: Colors.bgSecondary,
    borderLeftWidth: 1,
    borderLeftColor: Colors.borderGlass,
  },
  sidePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGlass,
  },
  sidePanelTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  closeBtn: {
    fontSize: FontSizes.xl,
    color: Colors.textMuted,
    padding: Spacing.sm,
  },
  sidePanelBody: {
    padding: Spacing.lg,
  },
  settingSectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  settingValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  settingHint: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.borderGlass,
    marginVertical: Spacing.lg,
  },
  settingBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    marginBottom: Spacing.sm,
  },
  settingBtnText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  settingBtnPrimary: {
    backgroundColor: 'rgba(68,138,255,0.15)',
    borderColor: Colors.blue,
  },
  settingBtnPrimaryText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.blue,
    textAlign: 'center',
  },
  settingBtnDanger: {
    fontSize: FontSizes.md,
    color: Colors.red,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  statLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
});
