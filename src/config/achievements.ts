// ============================================
// TAP TYCOON — Achievement & Daily Reward Definitions
// ============================================

import { Achievement, DailyReward } from '../types';

export const ACHIEVEMENTS: readonly Achievement[] = [
  // — Tap milestones —
  { id: 'tap_100', name: 'First Steps', icon: '👆', description: 'Tap 100 times', reward: 100, type: 'taps', value: 100 },
  { id: 'tap_1k', name: 'Tap Enthusiast', icon: '👆', description: 'Tap 1,000 times', reward: 1_000, type: 'taps', value: 1_000 },
  { id: 'tap_10k', name: 'Tap Machine', icon: '🤖', description: 'Tap 10,000 times', reward: 50_000, type: 'taps', value: 10_000 },
  { id: 'tap_100k', name: 'Legendary Tapper', icon: '🏆', description: 'Tap 100,000 times', reward: 5_000_000, type: 'taps', value: 100_000 },

  // — Total earnings milestones —
  { id: 'earn_1k', name: 'Making Money', icon: '💵', description: 'Earn $1K total', reward: 200, type: 'total_earned', value: 1_000 },
  { id: 'earn_100k', name: 'Getting Rich', icon: '💰', description: 'Earn $100K total', reward: 20_000, type: 'total_earned', value: 100_000 },
  { id: 'earn_1m', name: 'Millionaire', icon: '🤑', description: 'Earn $1M total', reward: 200_000, type: 'total_earned', value: 1_000_000 },
  { id: 'earn_1b', name: 'Billionaire', icon: '🏦', description: 'Earn $1B total', reward: 200_000_000, type: 'total_earned', value: 1_000_000_000 },
  { id: 'earn_1t', name: 'Trillionaire', icon: '🌍', description: 'Earn $1T total', reward: 200_000_000_000, type: 'total_earned', value: 1_000_000_000_000 },

  // — Business ownership —
  { id: 'biz_1', name: 'Entrepreneur', icon: '🏢', description: 'Own 1 business', reward: 50, type: 'businesses_owned', value: 1 },
  { id: 'biz_5', name: 'Mogul', icon: '🏙️', description: 'Own 5 businesses', reward: 50_000, type: 'businesses_owned', value: 5 },
  { id: 'biz_10', name: 'Empire Builder', icon: '🌆', description: 'Own all 10 businesses', reward: 100_000_000, type: 'businesses_owned', value: 10 },

  // — Business level milestones —
  { id: 'level_25', name: 'Dedicated', icon: '📈', description: 'Get any business to Lv.25', reward: 5_000, type: 'max_business_level', value: 25 },
  { id: 'level_50', name: 'Half Century', icon: '🎯', description: 'Get any business to Lv.50', reward: 100_000, type: 'max_business_level', value: 50 },
  { id: 'level_100', name: 'Centurion', icon: '💯', description: 'Get any business to Lv.100', reward: 5_000_000, type: 'max_business_level', value: 100 },

  // — Prestige —
  { id: 'prestige_1', name: 'Rebirth', icon: '⭐', description: 'Prestige for the first time', reward: 0, type: 'prestiges', value: 1 },
  { id: 'prestige_5', name: 'Reborn', icon: '🌟', description: 'Prestige 5 times', reward: 0, type: 'prestiges', value: 5 },
  { id: 'prestige_10', name: 'Ascended', icon: '✨', description: 'Prestige 10 times', reward: 0, type: 'prestiges', value: 10 },

  // — Income milestones —
  { id: 'ips_100', name: 'Steady Income', icon: '📊', description: 'Reach $100/s', reward: 2_000, type: 'income_per_sec', value: 100 },
  { id: 'ips_10k', name: 'Cash Flow', icon: '💸', description: 'Reach $10K/s', reward: 200_000, type: 'income_per_sec', value: 10_000 },
  { id: 'ips_1m', name: 'Money River', icon: '🌊', description: 'Reach $1M/s', reward: 100_000_000, type: 'income_per_sec', value: 1_000_000 },
];

export const ACHIEVEMENT_MAP = new Map(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

// ---- Daily Rewards (7-day rotating cycle) ----

export const DAILY_REWARDS: readonly DailyReward[] = [
  { day: 1, icon: '💰', amount: 500, label: '$500' },
  { day: 2, icon: '💰', amount: 1_500, label: '$1.5K' },
  { day: 3, icon: '💰', amount: 5_000, label: '$5K' },
  { day: 4, icon: '💎', amount: 1, label: '1 PP', type: 'prestige' },
  { day: 5, icon: '💰', amount: 25_000, label: '$25K' },
  { day: 6, icon: '💰', amount: 100_000, label: '$100K' },
  { day: 7, icon: '💎', amount: 5, label: '5 PP', type: 'prestige' },
];
