// ============================================
// TAP TYCOON — Business Definitions
//
// Each business has escalating cost and income,
// creating a satisfying progression curve.
// ============================================

import { Business } from '../types';

export const BUSINESSES: readonly Business[] = [
  {
    id: 'lemonade',
    name: 'Lemonade Stand',
    icon: '🍋',
    baseCost: 50,
    baseIncome: 1,
    description: 'A refreshing start to your empire',
  },
  {
    id: 'newspaper',
    name: 'Newspaper Route',
    icon: '📰',
    baseCost: 300,
    baseIncome: 5,
    description: 'Deliver the daily news',
  },
  {
    id: 'carwash',
    name: 'Car Wash',
    icon: '🚗',
    baseCost: 1_500,
    baseIncome: 22,
    description: 'Keep the city shiny',
  },
  {
    id: 'pizza',
    name: 'Pizza Shop',
    icon: '🍕',
    baseCost: 8_000,
    baseIncome: 100,
    description: 'Everyone loves pizza',
  },
  {
    id: 'donut',
    name: 'Donut Factory',
    icon: '🍩',
    baseCost: 50_000,
    baseIncome: 500,
    description: 'Mass-produce delicious donuts',
  },
  {
    id: 'shrimp',
    name: 'Shrimp Boat',
    icon: '🦐',
    baseCost: 350_000,
    baseIncome: 2_800,
    description: "Harvest the ocean's bounty",
  },
  {
    id: 'hockey',
    name: 'Hockey Team',
    icon: '🏒',
    baseCost: 2_500_000,
    baseIncome: 18_000,
    description: 'Own a professional sports team',
  },
  {
    id: 'movie',
    name: 'Movie Studio',
    icon: '🎬',
    baseCost: 20_000_000,
    baseIncome: 120_000,
    description: 'Produce blockbuster films',
  },
  {
    id: 'bank',
    name: 'Bank',
    icon: '🏦',
    baseCost: 200_000_000,
    baseIncome: 1_000_000,
    description: 'Control the flow of money',
  },
  {
    id: 'oil',
    name: 'Oil Company',
    icon: '🛢️',
    baseCost: 2_500_000_000,
    baseIncome: 8_500_000,
    description: 'The ultimate money machine',
  },
] as const;

/** Quick lookup map: businessId → Business. */
export const BUSINESS_MAP = new Map(
  BUSINESSES.map((b) => [b.id, b]),
);
