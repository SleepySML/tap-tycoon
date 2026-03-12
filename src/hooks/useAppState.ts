// ============================================
// BASEMENT TYCOON — App State Hook
//
// Handles app going to background/foreground.
// On return from background, applies partial offline
// earnings for the time the app was hidden.
// ============================================

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { GAME } from '../config/constants';
import * as Calc from '../utils/calculations';

/**
 * Monitors app state transitions (active ↔ background).
 * When returning to foreground after >5s, applies offline earnings.
 */
export function useAppState(): void {
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimeRef = useRef(0);

  useEffect(() => {
    const handleChange = (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        // Returning to foreground
        const elapsed = (Date.now() - backgroundTimeRef.current) / 1_000;
        if (elapsed > 5) {
          const state = useGameStore.getState();
          const income =
            Calc.calculateIncomePerSecond(state) *
            elapsed *
            GAME.OFFLINE_EARNING_RATE;
          if (income > 0) {
            useGameStore.setState({
              money: state.money + income,
              totalEarned: state.totalEarned + income,
            });
          }
        }
      }

      if (nextState.match(/inactive|background/)) {
        backgroundTimeRef.current = Date.now();
      }

      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, []);
}
