// ============================================
// BASEMENT TYCOON — Game Balance Constants
//
// All economic tuning knobs in one place.
// Adjust these to change game feel and pacing.
// ============================================

export const GAME = {
  /** Base money earned per tap (before multipliers). */
  BASE_TAP_VALUE: 1,

  /** Cost multiplier per business level (compound). 1.15 = 15% increase per level. */
  COST_MULTIPLIER: 1.15,

  /** Total earned required for the first prestige. */
  PRESTIGE_THRESHOLD: 1_000_000,

  /** Exponent in prestige-point formula: floor((totalEarned / threshold) ^ exponent). */
  PRESTIGE_EXPONENT: 0.5,

  /** Income multiplier bonus per prestige point (+5%). */
  PRESTIGE_MULT_PER_POINT: 0.05,

  /** Fraction of online income earned while offline (0.5 = 50%). */
  OFFLINE_EARNING_RATE: 0.5,

  /** Maximum offline earning window in hours. */
  MAX_OFFLINE_HOURS: 8,

  /** Game tick interval in milliseconds (10 ticks/sec). */
  TICK_INTERVAL_MS: 100,

  /** Auto-save interval in milliseconds. */
  AUTO_SAVE_INTERVAL_MS: 30_000,

  /** Duration of rewarded-ad boost in minutes. */
  BOOST_DURATION_MINUTES: 120,

  /** Boost multiplier (applied to all income and taps). */
  BOOST_MULTIPLIER: 2,

  /** Max number of business levels to compute for "max" buy. Safety cap. */
  MAX_BUY_CALC: 10_000,

  /** Income is calculated per-second internally but balanced as per-minute.
   *  Divide base income by this factor so 1 min of play = same total as before. */
  INCOME_RATE_DIVISOR: 60,
} as const;
