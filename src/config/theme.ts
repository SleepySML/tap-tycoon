// ============================================
// TAP TYCOON — Visual Theme Constants
//
// Single source of truth for all colors, spacing,
// typography, and radii used across the app.
// ============================================

export const Colors = {
  // Backgrounds
  bgPrimary: '#0a0a1a',
  bgSecondary: '#12122a',
  bgCard: 'rgba(255,255,255,0.05)',
  bgCardHover: 'rgba(255,255,255,0.08)',
  bgGlass: 'rgba(255,255,255,0.07)',

  // Borders
  borderGlass: 'rgba(255,255,255,0.1)',
  borderGold: 'rgba(255,215,0,0.3)',
  borderGreen: 'rgba(0,230,118,0.3)',
  borderPurple: 'rgba(179,136,255,0.2)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.4)',

  // Accents
  gold: '#ffd700',
  goldDark: '#b8960f',
  green: '#00e676',
  greenDark: '#00c853',
  blue: '#448aff',
  purple: '#b388ff',
  purpleDark: '#7c4dff',
  red: '#ff5252',
  orange: '#ffab40',
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 28,
  hero: 36,
} as const;

export const FontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};
