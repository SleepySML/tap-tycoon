// ============================================
// TAP TYCOON — Cloud Sync Hook
//
// Syncs game state to/from Supabase for authenticated users.
//
// Sync strategy (optimized for cost + UX):
//   - Auto-save every 60s (not 30s like local — reduces DB writes)
//   - Save on app background (catch the moment they leave)
//   - Load cloud save on sign-in (merge with local if needed)
//   - Merge conflict: highest totalEarned wins (most progress)
//   - Update leaderboard on save (piggyback, no extra request)
//
// Cost analysis at 2K DAU:
//   - 2K users × 1 save/min × 30 min/day = 60K writes/day
//   - Supabase free tier: unlimited API requests ✓
//   - Database storage: 2K × 2KB = 4MB (of 500MB free) ✓
// ============================================

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { useAuthStore, selectIsAuthenticated } from '../store/authStore';
import { useGameStore, GameStore } from '../store/gameStore';
import { GameState } from '../types';

const CLOUD_SAVE_INTERVAL_MS = 60_000; // 60 seconds

/**
 * Extracts the serializable GameState from the store.
 * (Same fields as the persist partialize function.)
 */
function extractGameState(store: GameStore): GameState {
  return {
    money: store.money,
    totalEarned: store.totalEarned,
    totalTaps: store.totalTaps,
    totalPrestiges: store.totalPrestiges,
    prestigePoints: store.prestigePoints,
    businesses: store.businesses,
    upgrades: store.upgrades,
    prestigeUpgrades: store.prestigeUpgrades,
    achievements: store.achievements,
    boostEndTime: store.boostEndTime,
    dailyStreak: store.dailyStreak,
    lastDailyDate: store.lastDailyDate,
    lastSaveTime: Date.now(),
    timePlayed: store.timePlayed,
    sessions: store.sessions,
  };
}

/**
 * Save current game state to Supabase.
 * Also updates the leaderboard entry.
 */
async function saveToCloud(userId: string): Promise<boolean> {
  try {
    const state = extractGameState(useGameStore.getState());
    const displayName =
      useAuthStore.getState().user?.user_metadata?.full_name || 'Player';

    // Upsert game save + leaderboard in parallel
    const [saveResult, leaderResult] = await Promise.all([
      supabase.from('game_saves').upsert({
        user_id: userId,
        save_data: state,
        updated_at: new Date().toISOString(),
      }),
      supabase.from('leaderboards').upsert({
        user_id: userId,
        display_name: displayName,
        total_earned: state.totalEarned,
        prestiges: state.totalPrestiges,
        businesses_owned: Object.values(state.businesses).filter((l) => l > 0)
          .length,
        updated_at: new Date().toISOString(),
      }),
    ]);

    if (saveResult.error) {
      console.warn('[CloudSync] Save error:', saveResult.error.message);
      return false;
    }
    if (leaderResult.error) {
      console.warn('[CloudSync] Leaderboard error:', leaderResult.error.message);
    }

    return true;
  } catch (err) {
    console.warn('[CloudSync] Exception:', err);
    return false;
  }
}

/**
 * Load game state from Supabase.
 * Returns the cloud state, or null if none exists.
 */
async function loadFromCloud(
  userId: string,
): Promise<GameState | null> {
  try {
    const { data, error } = await supabase
      .from('game_saves')
      .select('save_data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[CloudSync] Load error:', error.message);
      return null;
    }

    return data?.save_data ?? null;
  } catch (err) {
    console.warn('[CloudSync] Load exception:', err);
    return null;
  }
}

/**
 * Merge cloud state into local state.
 * Strategy: the save with higher totalEarned wins (most progress).
 * This prevents data loss while being simple to understand.
 */
function mergeCloudState(cloudState: GameState): void {
  const localState = useGameStore.getState();

  if (cloudState.totalEarned > localState.totalEarned) {
    // Cloud has more progress — apply it
    useGameStore.setState({
      money: cloudState.money,
      totalEarned: cloudState.totalEarned,
      totalTaps: cloudState.totalTaps,
      totalPrestiges: cloudState.totalPrestiges,
      prestigePoints: cloudState.prestigePoints,
      businesses: cloudState.businesses,
      upgrades: cloudState.upgrades,
      prestigeUpgrades: cloudState.prestigeUpgrades,
      achievements: cloudState.achievements,
      boostEndTime: cloudState.boostEndTime,
      dailyStreak: cloudState.dailyStreak,
      lastDailyDate: cloudState.lastDailyDate,
      timePlayed: cloudState.timePlayed,
      sessions: cloudState.sessions,
    });
    console.log('[CloudSync] Loaded cloud save (more progress)');
  } else {
    console.log('[CloudSync] Keeping local save (more progress)');
  }
}

/**
 * Cloud sync hook. Call once at the top level.
 * Handles: load on auth, periodic saves, save on background.
 */
export function useCloudSync(): void {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Load cloud save when user signs in
  useEffect(() => {
    if (!isAuthenticated || !userId || !isSupabaseConfigured()) return;

    loadFromCloud(userId).then((cloudState) => {
      if (cloudState) {
        mergeCloudState(cloudState);
      }
    });
  }, [isAuthenticated, userId]);

  // Periodic cloud save
  useEffect(() => {
    if (!isAuthenticated || !userId || !isSupabaseConfigured()) return;

    intervalRef.current = setInterval(() => {
      saveToCloud(userId);
    }, CLOUD_SAVE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, userId]);

  // Save to cloud when app goes to background
  useEffect(() => {
    if (!isAuthenticated || !userId || !isSupabaseConfigured()) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState.match(/inactive|background/)) {
        saveToCloud(userId);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [isAuthenticated, userId]);
}
