// ============================================
// BASEMENT TYCOON — Number & Money Formatting
//
// Pure functions — no side effects, easily testable.
// ============================================

const SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc',
  'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc',
] as const;

/**
 * Format a large number with SI-like suffixes.
 * Examples: 1234 → "1.23K", 1_500_000 → "1.50M"
 */
export function formatNumber(num: number): string {
  if (!Number.isFinite(num)) return String(num);
  if (num < 0) return '-' + formatNumber(-num);
  if (num < 1_000) return Math.floor(num).toLocaleString('en-US');

  const tier = Math.floor(Math.log10(Math.abs(num)) / 3);
  if (tier === 0) return Math.floor(num).toLocaleString('en-US');
  if (tier >= SUFFIXES.length) return num.toExponential(2);

  const scale = Math.pow(10, tier * 3);
  const scaled = num / scale;

  const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return scaled.toFixed(decimals) + SUFFIXES[tier];
}

/**
 * Format a number as money.
 * Examples: 1234 → "$1.23K", 50 → "$50"
 */
export function formatMoney(num: number): string {
  return '$' + formatNumber(num);
}

/**
 * Format seconds into a human-readable duration.
 * Examples: 90 → "1m 30s", 3661 → "1h 1m"
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return Math.floor(seconds) + 's';
  if (seconds < 3_600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Format seconds as MM:SS (for boost timer display).
 */
export function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
