// ============================================
// BASEMENT TYCOON — Pure Game-Math Functions
//
// Every calculation the game needs, as pure functions.
// Takes state in, returns numbers out. Zero side effects.
// This makes the logic testable and the store thin.
// ============================================

import { GameState } from '../types';
import { GAME } from '../config/constants';
import { BUSINESSES, BUSINESS_MAP } from '../config/businesses';
import { UPGRADE_MAP, PRESTIGE_UPGRADE_MAP } from '../config/upgrades';
import { ACHIEVEMENTS } from '../config/achievements';

// ---- Prestige Multiplier ----

export function getPrestigeMultiplier(prestigePoints: number): number {
  return 1 + prestigePoints * GAME.PRESTIGE_MULT_PER_POINT;
}

// ---- Boost ----

export function isBoostActive(boostEndTime: number): boolean {
  return Date.now() < boostEndTime;
}

export function getBoostMultiplier(boostEndTime: number): number {
  return isBoostActive(boostEndTime) ? GAME.BOOST_MULTIPLIER : 1;
}

// ---- Cost Reduction (from prestige upgrades) ----

function getCostReduction(prestigeUpgrades: string[]): number {
  let reduction = 1;
  for (const id of prestigeUpgrades) {
    const up = PRESTIGE_UPGRADE_MAP.get(id);
    if (up?.type === 'cost_reduction') reduction *= up.value;
  }
  return reduction;
}

// ---- Global Multiplier (from regular + prestige upgrades) ----

function getGlobalMultiplier(
  upgrades: string[],
  prestigeUpgrades: string[],
): number {
  let mult = 1;
  for (const id of upgrades) {
    const up = UPGRADE_MAP.get(id);
    if (up?.type === 'global_multiplier') mult *= up.value;
  }
  for (const id of prestigeUpgrades) {
    const up = PRESTIGE_UPGRADE_MAP.get(id);
    if (up?.type === 'global_multiplier') mult *= up.value;
  }
  return mult;
}

// ---- Tap Value ----

export function calculateTapValue(state: GameState): number {
  let value = GAME.BASE_TAP_VALUE;

  // Tap upgrades (regular)
  for (const id of state.upgrades) {
    const up = UPGRADE_MAP.get(id);
    if (up?.type === 'tap_multiplier') value *= up.value;
  }

  // Tap upgrades (prestige)
  for (const id of state.prestigeUpgrades) {
    const up = PRESTIGE_UPGRADE_MAP.get(id);
    if (up?.type === 'tap_multiplier') value *= up.value;
  }

  value *= getPrestigeMultiplier(state.prestigePoints);
  value *= getBoostMultiplier(state.boostEndTime);

  return value;
}

// ---- Business Income ----

/** Income per second for a single business (after all multipliers). */
export function calculateBusinessIncome(
  state: GameState,
  bizId: string,
): number {
  const biz = BUSINESS_MAP.get(bizId);
  if (!biz) return 0;

  const level = state.businesses[bizId] ?? 0;
  if (level === 0) return 0;

  let income = biz.baseIncome * level;

  // Business-specific multipliers
  for (const id of state.upgrades) {
    const up = UPGRADE_MAP.get(id);
    if (up?.type === 'business_multiplier' && up.target === bizId) {
      income *= up.value;
    }
  }

  income *= getGlobalMultiplier(state.upgrades, state.prestigeUpgrades);
  income *= getPrestigeMultiplier(state.prestigePoints);
  income *= getBoostMultiplier(state.boostEndTime);

  return income / GAME.INCOME_RATE_DIVISOR;
}

/** Total income per second across all businesses. */
export function calculateIncomePerSecond(state: GameState): number {
  let total = 0;
  for (const biz of BUSINESSES) {
    total += calculateBusinessIncome(state, biz.id);
  }
  return total;
}

// ---- Business Cost ----

/** Cost to buy `amount` levels of a business. */
export function calculateBusinessCost(
  state: GameState,
  bizId: string,
  amount: number,
): number {
  const biz = BUSINESS_MAP.get(bizId);
  if (!biz) return Infinity;

  const currentLevel = state.businesses[bizId] ?? 0;
  const costReduction = getCostReduction(state.prestigeUpgrades);

  let total = 0;
  for (let i = 0; i < amount; i++) {
    total +=
      biz.baseCost *
      Math.pow(GAME.COST_MULTIPLIER, currentLevel + i) *
      costReduction;
  }
  return total;
}

/** Maximum number of levels the player can afford for a business. */
export function calculateMaxAffordable(
  state: GameState,
  bizId: string,
): number {
  const biz = BUSINESS_MAP.get(bizId);
  if (!biz) return 0;

  const currentLevel = state.businesses[bizId] ?? 0;
  const costReduction = getCostReduction(state.prestigeUpgrades);
  let remaining = state.money;
  let count = 0;

  while (count < GAME.MAX_BUY_CALC) {
    const nextCost =
      biz.baseCost *
      Math.pow(GAME.COST_MULTIPLIER, currentLevel + count) *
      costReduction;
    if (nextCost > remaining) break;
    remaining -= nextCost;
    count++;
  }

  return count;
}

// ---- Upgrade Requirements ----

export function isUpgradeUnlocked(
  state: GameState,
  upgradeId: string,
): boolean {
  const up = UPGRADE_MAP.get(upgradeId);
  if (!up?.requirement) return true;

  const req = up.requirement;
  switch (req.type) {
    case 'taps':
      return state.totalTaps >= req.value;
    case 'business_level':
      return (state.businesses[req.target!] ?? 0) >= req.value;
    case 'total_earned':
      return state.totalEarned >= req.value;
    default:
      return true;
  }
}

// ---- Prestige ----

export function calculatePrestigeEarnable(totalEarned: number): number {
  if (totalEarned < GAME.PRESTIGE_THRESHOLD) return 0;
  return Math.floor(
    Math.pow(totalEarned / GAME.PRESTIGE_THRESHOLD, GAME.PRESTIGE_EXPONENT),
  );
}

/** Starting money after prestige (from prestige upgrades). */
export function getStartBonus(prestigeUpgrades: string[]): number {
  let bonus = 0;
  for (const id of prestigeUpgrades) {
    const up = PRESTIGE_UPGRADE_MAP.get(id);
    if (up?.type === 'start_bonus') bonus += up.value;
  }
  return bonus;
}

// ---- Offline Earnings ----

export function calculateOfflineEarnings(state: GameState): number {
  if (!state.lastSaveTime) return 0;

  const elapsed = (Date.now() - state.lastSaveTime) / 1_000;
  const capped = Math.min(elapsed, GAME.MAX_OFFLINE_HOURS * 3_600);
  if (capped < 60) return 0; // minimum 1 minute away

  let rate = GAME.OFFLINE_EARNING_RATE;
  for (const id of state.prestigeUpgrades) {
    const up = PRESTIGE_UPGRADE_MAP.get(id);
    if (up?.type === 'offline_multiplier') rate *= up.value;
  }

  return calculateIncomePerSecond(state) * capped * rate;
}

// ---- Achievement Checking ----

/**
 * Returns newly unlocked achievement IDs (and their rewards).
 * Does NOT mutate state — the caller applies the results.
 */
export function checkAchievements(
  state: GameState,
  currentIncomePerSec: number,
): { id: string; reward: number }[] {
  const newlyUnlocked: { id: string; reward: number }[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (state.achievements.includes(ach.id)) continue;

    let unlocked = false;
    switch (ach.type) {
      case 'taps':
        unlocked = state.totalTaps >= ach.value;
        break;
      case 'total_earned':
        unlocked = state.totalEarned >= ach.value;
        break;
      case 'businesses_owned': {
        const owned = Object.values(state.businesses).filter((l) => l > 0).length;
        unlocked = owned >= ach.value;
        break;
      }
      case 'max_business_level': {
        const max = Math.max(0, ...Object.values(state.businesses));
        unlocked = max >= ach.value;
        break;
      }
      case 'prestiges':
        unlocked = state.totalPrestiges >= ach.value;
        break;
      case 'income_per_sec':
        unlocked = currentIncomePerSec >= ach.value;
        break;
    }

    if (unlocked) {
      newlyUnlocked.push({ id: ach.id, reward: ach.reward });
    }
  }

  return newlyUnlocked;
}

// ---- Daily Rewards ----

export function canClaimDaily(lastDailyDate: string | null): boolean {
  if (!lastDailyDate) return true;
  return new Date(lastDailyDate).toDateString() !== new Date().toDateString();
}

export function getDailyDay(streak: number): number {
  return (streak % 7) + 1;
}
