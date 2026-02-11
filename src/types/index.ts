// ============================================
// TAP TYCOON — Shared Type Definitions
// ============================================

/** A business the player can own and level up. */
export interface Business {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly baseCost: number;
  readonly baseIncome: number; // income per second per level
  readonly description: string;
}

/** An upgrade the player can purchase (one-time). */
export interface Upgrade {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly cost: number;
  readonly type: UpgradeType;
  readonly value: number;
  readonly target?: string; // business ID for business_multiplier
  readonly requirement?: UpgradeRequirement;
}

export type UpgradeType =
  | 'tap_multiplier'
  | 'business_multiplier'
  | 'global_multiplier'
  | 'offline_multiplier'
  | 'start_bonus'
  | 'cost_reduction';

export interface UpgradeRequirement {
  readonly type: 'taps' | 'business_level' | 'total_earned';
  readonly value: number;
  readonly target?: string; // business ID
}

/** A prestige upgrade bought with prestige points. */
export interface PrestigeUpgrade {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly cost: number; // in prestige points
  readonly type: UpgradeType;
  readonly value: number;
}

/** An achievement the player can unlock. */
export interface Achievement {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly reward: number; // cash reward
  readonly type: AchievementType;
  readonly value: number;
}

export type AchievementType =
  | 'taps'
  | 'total_earned'
  | 'businesses_owned'
  | 'max_business_level'
  | 'prestiges'
  | 'income_per_sec';

/** A daily reward entry. */
export interface DailyReward {
  readonly day: number;
  readonly icon: string;
  readonly amount: number;
  readonly label: string;
  readonly type?: 'prestige'; // if set, reward is prestige points
}

/** The buy-amount selector options. */
export type BuyAmount = 1 | 10 | 25 | 100 | 'max';

/** Active tab in the game UI. */
export type TabId = 'businesses' | 'upgrades' | 'prestige' | 'achievements';

/** Serializable game state (persisted to storage). */
export interface GameState {
  money: number;
  totalEarned: number;
  totalTaps: number;
  totalPrestiges: number;
  prestigePoints: number;
  businesses: Record<string, number>; // id → level
  upgrades: string[];                 // purchased upgrade IDs
  prestigeUpgrades: string[];         // purchased prestige upgrade IDs
  achievements: string[];             // unlocked achievement IDs
  boostEndTime: number;               // timestamp when boost expires
  dailyStreak: number;
  lastDailyDate: string | null;
  lastSaveTime: number;
  timePlayed: number;
  sessions: number;
}
