// ============================================
// TAP TYCOON — Zustand Game Store
//
// Architecture decisions:
//   - Zustand (not Context): selector-based subscriptions prevent
//     unnecessary re-renders during the 10-tick/sec game loop.
//   - persist middleware with AsyncStorage: state survives app
//     restarts on all platforms (iOS, Android, Web).
//   - Pure calculations live in utils/calculations.ts — the store
//     only orchestrates state transitions.
//   - partialize: only persist the GameState fields, not actions.
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GameState, BuyAmount } from '../types';
import { GAME } from '../config/constants';
import { UPGRADE_MAP, PRESTIGE_UPGRADE_MAP } from '../config/upgrades';
import { DAILY_REWARDS } from '../config/achievements';
import * as Calc from '../utils/calculations';

// ---- Store Shape ----

interface GameActions {
  /** Perform a tap. Returns the money earned. */
  tap: () => number;

  /** Buy `amount` levels of a business. Returns success. */
  buyBusiness: (bizId: string, amount: number) => boolean;

  /** Buy a one-time upgrade. Returns success. */
  buyUpgrade: (upgradeId: string) => boolean;

  /** Buy a prestige upgrade with prestige points. Returns success. */
  buyPrestigeUpgrade: (upgradeId: string) => boolean;

  /** Prestige: reset progress, earn prestige points. Returns points earned or 0. */
  prestige: () => number;

  /** Advance the game by `dt` seconds (passive income). Returns newly unlocked achievement IDs. */
  tick: (dt: number) => string[];

  /** Activate a 2× income/tap boost. */
  activateBoost: (minutes?: number) => void;

  /** Claim daily reward. */
  claimDaily: () => void;

  /** Apply offline earnings (called once on boot). Returns amount. */
  applyOfflineEarnings: () => number;

  /** Increment session counter (called once on boot). */
  incrementSession: () => void;

  /** Full reset (for settings → reset game). */
  resetAll: () => void;
}

export type GameStore = GameState & GameActions;

// ---- Default State ----

const DEFAULT_STATE: GameState = {
  money: 0,
  totalEarned: 0,
  totalTaps: 0,
  totalPrestiges: 0,
  prestigePoints: 0,
  businesses: {},
  upgrades: [],
  prestigeUpgrades: [],
  achievements: [],
  boostEndTime: 0,
  dailyStreak: 0,
  lastDailyDate: null,
  lastSaveTime: Date.now(),
  timePlayed: 0,
  sessions: 0,
};

// ---- Store Creation ----

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      // ---- Tap ----
      tap: () => {
        const state = get();
        const value = Calc.calculateTapValue(state);
        set({
          money: state.money + value,
          totalEarned: state.totalEarned + value,
          totalTaps: state.totalTaps + 1,
        });
        return value;
      },

      // ---- Buy Business ----
      buyBusiness: (bizId, amount) => {
        const state = get();
        const cost = Calc.calculateBusinessCost(state, bizId, amount);
        if (state.money < cost) return false;

        set({
          money: state.money - cost,
          businesses: {
            ...state.businesses,
            [bizId]: (state.businesses[bizId] ?? 0) + amount,
          },
        });
        return true;
      },

      // ---- Buy Upgrade ----
      buyUpgrade: (upgradeId) => {
        const state = get();
        const up = UPGRADE_MAP.get(upgradeId);
        if (!up) return false;
        if (state.upgrades.includes(upgradeId)) return false;
        if (state.money < up.cost) return false;
        if (!Calc.isUpgradeUnlocked(state, upgradeId)) return false;

        set({
          money: state.money - up.cost,
          upgrades: [...state.upgrades, upgradeId],
        });
        return true;
      },

      // ---- Buy Prestige Upgrade ----
      buyPrestigeUpgrade: (upgradeId) => {
        const state = get();
        const up = PRESTIGE_UPGRADE_MAP.get(upgradeId);
        if (!up) return false;
        if (state.prestigeUpgrades.includes(upgradeId)) return false;
        if (state.prestigePoints < up.cost) return false;

        set({
          prestigePoints: state.prestigePoints - up.cost,
          prestigeUpgrades: [...state.prestigeUpgrades, upgradeId],
        });
        return true;
      },

      // ---- Prestige ----
      prestige: () => {
        const state = get();
        const points = Calc.calculatePrestigeEarnable(state.totalEarned);
        if (points <= 0) return 0;

        const startBonus = Calc.getStartBonus(state.prestigeUpgrades);

        set({
          money: startBonus,
          totalEarned: startBonus,
          totalTaps: 0,
          businesses: {},
          upgrades: [],
          boostEndTime: 0,
          prestigePoints: state.prestigePoints + points,
          totalPrestiges: state.totalPrestiges + 1,
          // Keep: prestigeUpgrades, achievements, dailyStreak, sessions, timePlayed
        });

        return points;
      },

      // ---- Game Tick ----
      tick: (dt) => {
        const state = get();
        const income = Calc.calculateIncomePerSecond(state) * dt;

        const newMoney = state.money + income;
        const newEarned = state.totalEarned + income;
        const newTimePlayed = state.timePlayed + dt;

        // Check achievements
        const currentIPS = Calc.calculateIncomePerSecond({
          ...state,
          money: newMoney,
          totalEarned: newEarned,
        });
        const newAchievements = Calc.checkAchievements(
          { ...state, money: newMoney, totalEarned: newEarned },
          currentIPS,
        );

        // Apply achievement rewards
        let bonusMoney = 0;
        const newAchIds: string[] = [];
        for (const ach of newAchievements) {
          bonusMoney += ach.reward;
          newAchIds.push(ach.id);
        }

        set({
          money: newMoney + bonusMoney,
          totalEarned: newEarned + bonusMoney,
          timePlayed: newTimePlayed,
          ...(newAchIds.length > 0 && {
            achievements: [...state.achievements, ...newAchIds],
          }),
        });

        return newAchIds;
      },

      // ---- Boost ----
      activateBoost: (minutes = GAME.BOOST_DURATION_MINUTES) => {
        set({ boostEndTime: Date.now() + minutes * 60 * 1_000 });
      },

      // ---- Daily Reward ----
      claimDaily: () => {
        const state = get();
        if (!Calc.canClaimDaily(state.lastDailyDate)) return;

        const now = new Date();
        const lastDate = state.lastDailyDate
          ? new Date(state.lastDailyDate)
          : null;

        // Check streak continuity
        let newStreak = state.dailyStreak;
        if (lastDate) {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          if (lastDate.toDateString() !== yesterday.toDateString()) {
            newStreak = 0; // streak broken
          }
        }

        const day = (newStreak % 7) + 1;
        const reward = DAILY_REWARDS[day - 1];

        if (reward.type === 'prestige') {
          set({
            prestigePoints: state.prestigePoints + reward.amount,
            dailyStreak: newStreak + 1,
            lastDailyDate: now.toISOString(),
          });
        } else {
          const scaled = Math.max(reward.amount, state.totalEarned * 0.01);
          set({
            money: state.money + scaled,
            totalEarned: state.totalEarned + scaled,
            dailyStreak: newStreak + 1,
            lastDailyDate: now.toISOString(),
          });
        }
      },

      // ---- Offline Earnings ----
      applyOfflineEarnings: () => {
        const state = get();
        const earnings = Calc.calculateOfflineEarnings(state);
        if (earnings > 0) {
          set({
            money: state.money + earnings,
            totalEarned: state.totalEarned + earnings,
          });
        }
        return earnings;
      },

      // ---- Session ----
      incrementSession: () => {
        set((s) => ({ sessions: s.sessions + 1 }));
      },

      // ---- Reset ----
      resetAll: () => {
        set({ ...DEFAULT_STATE, lastSaveTime: Date.now() });
      },
    }),
    {
      name: 'tap-tycoon-save',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist data fields, not action functions
      partialize: (state) => ({
        money: state.money,
        totalEarned: state.totalEarned,
        totalTaps: state.totalTaps,
        totalPrestiges: state.totalPrestiges,
        prestigePoints: state.prestigePoints,
        businesses: state.businesses,
        upgrades: state.upgrades,
        prestigeUpgrades: state.prestigeUpgrades,
        achievements: state.achievements,
        boostEndTime: state.boostEndTime,
        dailyStreak: state.dailyStreak,
        lastDailyDate: state.lastDailyDate,
        lastSaveTime: Date.now(),
        timePlayed: state.timePlayed,
        sessions: state.sessions,
      }),
    },
  ),
);

// ============================================
// Selectors
//
// Components use these to subscribe to specific
// slices of state. Zustand only re-renders a
// component when its selected value changes
// (compared by Object.is for primitives).
// ============================================

export const selectMoney = (s: GameStore) => s.money;
export const selectTotalEarned = (s: GameStore) => s.totalEarned;
export const selectTotalTaps = (s: GameStore) => s.totalTaps;
export const selectPrestigePoints = (s: GameStore) => s.prestigePoints;
export const selectTotalPrestiges = (s: GameStore) => s.totalPrestiges;
export const selectBusinesses = (s: GameStore) => s.businesses;
export const selectUpgrades = (s: GameStore) => s.upgrades;
export const selectPrestigeUpgrades = (s: GameStore) => s.prestigeUpgrades;
export const selectAchievements = (s: GameStore) => s.achievements;
export const selectBoostEndTime = (s: GameStore) => s.boostEndTime;
export const selectTimePlayed = (s: GameStore) => s.timePlayed;
export const selectSessions = (s: GameStore) => s.sessions;
