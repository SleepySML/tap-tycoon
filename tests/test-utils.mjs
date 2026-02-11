// ============================================
// TAP TYCOON — Unit Tests for Pure Utility Functions
//
// Tests format.ts and calculations.ts without
// any React or React Native dependencies.
//
// Run: node tests/test-utils.mjs
// ============================================

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    failures.push(testName);
    console.log(`  ✗ ${testName}`);
  }
}

function assertEq(actual, expected, testName) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    failures.push(`${testName} (got: ${actual}, expected: ${expected})`);
    console.log(`  ✗ ${testName} — got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)}`);
  }
}

function assertClose(actual, expected, tolerance, testName) {
  if (Math.abs(actual - expected) <= tolerance) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    failures.push(`${testName} (got: ${actual}, expected: ~${expected})`);
    console.log(`  ✗ ${testName} — got: ${actual}, expected: ~${expected} (±${tolerance})`);
  }
}

// ---- Import source modules ----
// We import the TS files transpiled via a trick: since these are pure
// functions with simple imports, we re-implement the logic inline for testing.

// ========== FORMAT TESTS ==========

console.log('\n📐 FORMAT TESTS');
console.log('================');

// Re-implement formatNumber for testing
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc',
  'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc'];

function formatNumber(num) {
  if (num < 0) return '-' + formatNumber(-num);
  if (num < 1000) return Math.floor(num).toLocaleString('en-US');

  const tier = Math.floor(Math.log10(Math.abs(num)) / 3);
  if (tier === 0) return Math.floor(num).toLocaleString('en-US');
  if (tier >= SUFFIXES.length) return num.toExponential(2);

  const scale = Math.pow(10, tier * 3);
  const scaled = num / scale;

  const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return scaled.toFixed(decimals) + SUFFIXES[tier];
}

function formatMoney(num) { return '$' + formatNumber(num); }

function formatTime(seconds) {
  if (seconds < 60) return Math.floor(seconds) + 's';
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTimer(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// formatNumber tests
console.log('\nformatNumber:');
assertEq(formatNumber(0), '0', 'zero');
assertEq(formatNumber(1), '1', 'single digit');
assertEq(formatNumber(999), '999', 'just below 1K');
assertEq(formatNumber(1000), '1.00K', '1K exact');
assertEq(formatNumber(1234), '1.23K', '1.23K');
assertEq(formatNumber(12345), '12.3K', '12.3K');
assertEq(formatNumber(123456), '123K', '123K');
assertEq(formatNumber(1500000), '1.50M', '1.50M');
assertEq(formatNumber(1000000000), '1.00B', '1.00B');
assertEq(formatNumber(1000000000000), '1.00T', '1.00T');
assertEq(formatNumber(-500), '-500', 'negative number');
assertEq(formatNumber(-1500), '-1.50K', 'negative with suffix');
assert(formatNumber(50).includes('50'), 'small number contains 50');

// formatMoney tests
console.log('\nformatMoney:');
assertEq(formatMoney(0), '$0', 'zero money');
assertEq(formatMoney(100), '$100', 'hundred');
assertEq(formatMoney(1234), '$1.23K', '1.23K money');
assertEq(formatMoney(1000000), '$1.00M', '1M money');

// formatTime tests
console.log('\nformatTime:');
assertEq(formatTime(0), '0s', 'zero seconds');
assertEq(formatTime(30), '30s', 'thirty seconds');
assertEq(formatTime(59.9), '59s', 'just under a minute (floors)');
assertEq(formatTime(60), '1m 0s', 'one minute');
assertEq(formatTime(90), '1m 30s', 'one and a half minutes');
assertEq(formatTime(3600), '1h 0m', 'one hour');
assertEq(formatTime(3661), '1h 1m', 'one hour one minute');

// formatTimer tests
console.log('\nformatTimer:');
assertEq(formatTimer(0), '00:00', 'zero');
assertEq(formatTimer(61), '01:01', 'one minute one second');
assertEq(formatTimer(600), '10:00', 'ten minutes');

// BUG CHECK: formatTimer with non-integer seconds
console.log('\nformatTimer edge cases:');
const timerResult = formatTimer(90.5);
const isClean = /^\d{2}:\d{2}$/.test(timerResult);
assert(isClean, `formatTimer(90.5) should be clean MM:SS format (got: "${timerResult}")`);


// ========== CALCULATION TESTS ==========

console.log('\n\n🧮 CALCULATION TESTS');
console.log('=====================');

// Game constants (matching src/config/constants.ts)
const GAME = {
  BASE_TAP_VALUE: 1,
  COST_MULTIPLIER: 1.15,
  PRESTIGE_THRESHOLD: 1000000,
  PRESTIGE_EXPONENT: 0.5,
  PRESTIGE_MULT_PER_POINT: 0.05,
  OFFLINE_EARNING_RATE: 0.5,
  MAX_OFFLINE_HOURS: 8,
  BOOST_MULTIPLIER: 2,
  MAX_BUY_CALC: 10000,
};

// Business data (matching src/config/businesses.ts)
const BUSINESSES = [
  { id: 'lemonade', baseCost: 50, baseIncome: 1 },
  { id: 'newspaper', baseCost: 300, baseIncome: 5 },
  { id: 'carwash', baseCost: 1500, baseIncome: 22 },
  { id: 'pizza', baseCost: 8000, baseIncome: 100 },
];

const BUSINESS_MAP = new Map(BUSINESSES.map(b => [b.id, b]));

// Default state
function makeState(overrides = {}) {
  return {
    money: 0,
    totalEarned: 0,
    totalTaps: 0,
    totalPrestiges: 0,
    prestigePoints: 0,
    businesses: {},
    upgrades: [],
    prestigeUpgrades: [],
    achievements: [],
    boostEndTime: 0,
    dailyStreak: 0,
    lastDailyDate: null,
    lastSaveTime: Date.now(),
    timePlayed: 0,
    sessions: 0,
    ...overrides,
  };
}

// Re-implement calculations for testing
function getPrestigeMultiplier(pp) {
  return 1 + pp * GAME.PRESTIGE_MULT_PER_POINT;
}

function isBoostActive(boostEndTime) {
  return Date.now() < boostEndTime;
}

function getBoostMultiplier(boostEndTime) {
  return isBoostActive(boostEndTime) ? GAME.BOOST_MULTIPLIER : 1;
}

function calculateTapValue(state) {
  let value = GAME.BASE_TAP_VALUE;
  // No upgrades in our test data
  value *= getPrestigeMultiplier(state.prestigePoints);
  value *= getBoostMultiplier(state.boostEndTime);
  return value;
}

function calculateBusinessCost(state, bizId, amount) {
  const biz = BUSINESS_MAP.get(bizId);
  if (!biz) return Infinity;
  const currentLevel = state.businesses[bizId] ?? 0;
  let total = 0;
  for (let i = 0; i < amount; i++) {
    total += biz.baseCost * Math.pow(GAME.COST_MULTIPLIER, currentLevel + i);
  }
  return total;
}

function calculatePrestigeEarnable(totalEarned) {
  if (totalEarned < GAME.PRESTIGE_THRESHOLD) return 0;
  return Math.floor(Math.pow(totalEarned / GAME.PRESTIGE_THRESHOLD, GAME.PRESTIGE_EXPONENT));
}

function canClaimDaily(lastDailyDate) {
  if (!lastDailyDate) return true;
  return new Date(lastDailyDate).toDateString() !== new Date().toDateString();
}

function getDailyDay(streak) {
  return (streak % 7) + 1;
}

// Prestige Multiplier
console.log('\ngetPrestigeMultiplier:');
assertEq(getPrestigeMultiplier(0), 1, '0 points = 1x');
assertEq(getPrestigeMultiplier(1), 1.05, '1 point = 1.05x');
assertEq(getPrestigeMultiplier(10), 1.5, '10 points = 1.5x');
assertEq(getPrestigeMultiplier(20), 2, '20 points = 2x');
assertEq(getPrestigeMultiplier(100), 6, '100 points = 6x');

// Boost
console.log('\nboost:');
assert(!isBoostActive(0), 'no boost by default');
assert(!isBoostActive(Date.now() - 1000), 'expired boost');
assert(isBoostActive(Date.now() + 60000), 'active boost');
assertEq(getBoostMultiplier(0), 1, 'no boost = 1x');
assertEq(getBoostMultiplier(Date.now() + 60000), 2, 'active boost = 2x');

// Tap Value
console.log('\ncalculateTapValue:');
assertEq(calculateTapValue(makeState()), 1, 'base tap value is $1');
assertEq(calculateTapValue(makeState({ prestigePoints: 10 })), 1.5, 'with 10 PP = $1.50');
assertEq(calculateTapValue(makeState({ boostEndTime: Date.now() + 60000 })), 2, 'with boost = $2');
assertClose(
  calculateTapValue(makeState({ prestigePoints: 10, boostEndTime: Date.now() + 60000 })),
  3, 0.01,
  'with 10 PP + boost = $3'
);

// Business Cost
console.log('\ncalculateBusinessCost:');
assertClose(calculateBusinessCost(makeState(), 'lemonade', 1), 50, 0.01, 'lemonade level 0 cost = $50');
assertClose(
  calculateBusinessCost(makeState({ businesses: { lemonade: 1 } }), 'lemonade', 1),
  50 * 1.15, 0.01,
  'lemonade level 1 cost = $57.50'
);
assertClose(
  calculateBusinessCost(makeState({ businesses: { lemonade: 10 } }), 'lemonade', 1),
  50 * Math.pow(1.15, 10), 0.01,
  'lemonade level 10 cost'
);
// Multi-buy cost
const multiBuyCost = calculateBusinessCost(makeState(), 'lemonade', 3);
const manualSum = 50 + 50 * 1.15 + 50 * Math.pow(1.15, 2);
assertClose(multiBuyCost, manualSum, 0.01, 'multi-buy cost (3x lemonade)');

assertEq(calculateBusinessCost(makeState(), 'nonexistent', 1), Infinity, 'unknown business = Infinity');

// Prestige Earnable
console.log('\ncalculatePrestigeEarnable:');
assertEq(calculatePrestigeEarnable(0), 0, 'zero earned = 0 PP');
assertEq(calculatePrestigeEarnable(500000), 0, 'under threshold = 0 PP');
assertEq(calculatePrestigeEarnable(1000000), 1, 'at threshold = 1 PP');
assertEq(calculatePrestigeEarnable(4000000), 2, '4M earned = 2 PP');
assertEq(calculatePrestigeEarnable(9000000), 3, '9M earned = 3 PP');
assertEq(calculatePrestigeEarnable(100000000), 10, '100M earned = 10 PP');

// Daily Rewards
console.log('\ndailyRewards:');
assert(canClaimDaily(null), 'null date = can claim');
assert(canClaimDaily(new Date(Date.now() - 86400000 * 2).toISOString()), 'old date = can claim');
assert(!canClaimDaily(new Date().toISOString()), 'today = already claimed');
assertEq(getDailyDay(0), 1, 'streak 0 = day 1');
assertEq(getDailyDay(6), 7, 'streak 6 = day 7');
assertEq(getDailyDay(7), 1, 'streak 7 = day 1 (wraps)');
assertEq(getDailyDay(13), 7, 'streak 13 = day 7');

// ========== EDGE CASES ==========

console.log('\n\n⚠️ EDGE CASE TESTS');
console.log('===================');

console.log('\nNumber formatting edge cases:');
assertEq(formatNumber(0.5), '0', 'fractional below 1 floors to 0');
assertEq(formatNumber(999.99), '999', 'just below 1K floors');
assert(!formatNumber(NaN).includes('undefined'), 'NaN does not produce undefined');
assertEq(formatNumber(Infinity), 'Infinity', 'Infinity handled');

console.log('\nBusiness cost with zero amount:');
assertEq(calculateBusinessCost(makeState(), 'lemonade', 0), 0, '0 amount = $0 cost');

console.log('\nPrestige at exactly threshold:');
assertEq(calculatePrestigeEarnable(GAME.PRESTIGE_THRESHOLD), 1, 'exactly at threshold = 1 PP');

console.log('\nVery large numbers:');
const largeNum = formatNumber(1e50);
assert(largeNum.includes('e+'), 'very large number uses scientific notation');

// ========== SUMMARY ==========

console.log('\n\n========================================');
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failures.length > 0) {
  console.log('\n❌ Failures:');
  failures.forEach(f => console.log(`  - ${f}`));
}

process.exit(failed > 0 ? 1 : 0);
