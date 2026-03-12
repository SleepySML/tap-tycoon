// ============================================
// BASEMENT TYCOON — Game Loop Hook
//
// Runs at ~10 ticks/sec (TICK_INTERVAL_MS).
// Uses delta time so income is frame-rate independent.
//
// Design choice: setInterval (not requestAnimationFrame)
//   - RAF runs at 60fps — wasteful for an idle game
//   - setInterval at 100ms is 10 ticks/sec, plenty smooth
//   - Less battery drain on mobile
//   - Delta-time math handles any timer drift
// ============================================

import { useEffect, useRef, useCallback } from 'react';
import { GAME } from '../config/constants';
import { useGameStore } from '../store/gameStore';

type AchievementCallback = (achievementIds: string[]) => void;

/**
 * Starts the game tick loop. Call once at the top level.
 *
 * @param onNewAchievements - called when new achievements unlock
 */
export function useGameLoop(onNewAchievements?: AchievementCallback): void {
  const tick = useGameStore((s) => s.tick);
  const lastTickRef = useRef(Date.now());
  const callbackRef = useRef(onNewAchievements);
  callbackRef.current = onNewAchievements;

  useEffect(() => {
    lastTickRef.current = Date.now();

    const intervalId = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTickRef.current) / 1_000;
      lastTickRef.current = now;

      // Cap delta to prevent huge jumps (e.g. after device sleep)
      const cappedDt = Math.min(dt, 2);
      const newAchievements = tick(cappedDt);

      if (newAchievements.length > 0 && callbackRef.current) {
        callbackRef.current(newAchievements);
      }
    }, GAME.TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [tick]);
}
