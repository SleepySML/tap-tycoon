// ============================================
// TAP TYCOON — Store Integration Tests
//
// Tests the game store logic by re-implementing
// the Zustand store actions with the same math.
// This validates state transitions without needing
// React or Zustand imports.
//
// Run: node tests/test-store.mjs
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
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (match) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    failures.push(`${testName} (got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)})`);
    console.log(`  ✗ ${testName} — got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)}`);
  }
}

function assertClose(actual, expected, tol, testName) {
  if (Math.abs(actual - expected) <= tol) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    failures.push(`${testName} (got: ${actual}, expected: ~${expected})`);
    console.log(`  ✗ ${testName} — got: ${actual}, expected: ~${expected}`);
  }
}

// ---- Game Constants ----
const GAME = {
  BASE_TAP_VALUE: 1,
  COST_MULTIPLIER: 1.15,
  PRESTIGE_THRESHOLD: 1_000_000,
  PRESTIGE_EXPONENT: 0.5,
  PRESTIGE_MULT_PER_POINT: 0.05,
  OFFLINE_EARNING_RATE: 0.5,
  MAX_OFFLINE_HOURS: 8,
  BOOST_MULTIPLIER: 2,
  MAX_BUY_CALC: 10_000,
};

// ---- Business Data ----
const BUSINESSES_DATA = [
  { id: 'lemonade', baseCost: 50, baseIncome: 1 },
  { id: 'newspaper', baseCost: 300, baseIncome: 5 },
];
const BUSINESS_MAP = new Map(BUSINESSES_DATA.map(b => [b.id, b]));

// ---- Minimal Calculations ----
function calculateTapValue(state) {
  return GAME.BASE_TAP_VALUE * (1 + state.prestigePoints * GAME.PRESTIGE_MULT_PER_POINT);
}

function calculateBusinessCost(state, bizId, amount) {
  const biz = BUSINESS_MAP.get(bizId);
  if (!biz) return Infinity;
  const level = state.businesses[bizId] ?? 0;
  let total = 0;
  for (let i = 0; i < amount; i++) {
    total += biz.baseCost * Math.pow(GAME.COST_MULTIPLIER, level + i);
  }
  return total;
}

function calculateBusinessIncome(state, bizId) {
  const biz = BUSINESS_MAP.get(bizId);
  if (!biz) return 0;
  const level = state.businesses[bizId] ?? 0;
  if (level === 0) return 0;
  return biz.baseIncome * level * (1 + state.prestigePoints * GAME.PRESTIGE_MULT_PER_POINT);
}

function calculateIncomePerSecond(state) {
  let total = 0;
  for (const biz of BUSINESSES_DATA) {
    total += calculateBusinessIncome(state, biz.id);
  }
  return total;
}

function calculatePrestigeEarnable(totalEarned) {
  if (totalEarned < GAME.PRESTIGE_THRESHOLD) return 0;
  return Math.floor(Math.pow(totalEarned / GAME.PRESTIGE_THRESHOLD, GAME.PRESTIGE_EXPONENT));
}

// ---- Simulated Store ----
function createStore() {
  const state = {
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
  };

  return {
    get: () => state,

    tap: () => {
      const value = calculateTapValue(state);
      state.money += value;
      state.totalEarned += value;
      state.totalTaps += 1;
      return value;
    },

    buyBusiness: (bizId, amount) => {
      const cost = calculateBusinessCost(state, bizId, amount);
      if (state.money < cost) return false;
      state.money -= cost;
      state.businesses[bizId] = (state.businesses[bizId] ?? 0) + amount;
      return true;
    },

    tick: (dt) => {
      const income = calculateIncomePerSecond(state) * dt;
      state.money += income;
      state.totalEarned += income;
      state.timePlayed += dt;
      return [];
    },

    prestige: () => {
      const points = calculatePrestigeEarnable(state.totalEarned);
      if (points <= 0) return 0;
      state.prestigePoints += points;
      state.totalPrestiges += 1;
      state.money = 0;
      state.totalEarned = 0;
      state.totalTaps = 0;
      state.businesses = {};
      state.upgrades = [];
      state.boostEndTime = 0;
      return points;
    },

    activateBoost: (minutes = 120) => {
      state.boostEndTime = Date.now() + minutes * 60 * 1000;
    },

    resetAll: () => {
      Object.assign(state, {
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
      });
    },
  };
}

// ========== TESTS ==========

console.log('\n🏪 STORE INTEGRATION TESTS');
console.log('===========================\n');

// ---- TAP ----
console.log('Tap:');
{
  const store = createStore();
  const s = store.get();

  const value = store.tap();
  assertEq(value, 1, 'tap returns $1');
  assertEq(s.money, 1, 'money is $1 after tap');
  assertEq(s.totalEarned, 1, 'totalEarned is $1');
  assertEq(s.totalTaps, 1, 'totalTaps is 1');

  // Tap 99 more times
  for (let i = 0; i < 99; i++) store.tap();
  assertEq(s.money, 100, 'money is $100 after 100 taps');
  assertEq(s.totalTaps, 100, 'totalTaps is 100');
}

// ---- BUY BUSINESS ----
console.log('\nBuy Business:');
{
  const store = createStore();
  const s = store.get();

  // Can't buy without money
  assert(!store.buyBusiness('lemonade', 1), "Can't buy lemonade without money");
  assertEq(s.businesses['lemonade'], undefined, 'No lemonade owned');

  // Earn enough
  for (let i = 0; i < 50; i++) store.tap();
  assertEq(s.money, 50, '$50 after 50 taps');

  // Buy lemonade stand
  assert(store.buyBusiness('lemonade', 1), 'Buy lemonade (cost $50)');
  assertEq(s.businesses['lemonade'], 1, 'Lemonade level is 1');
  assertClose(s.money, 0, 0.01, 'Money is $0 after buying');

  // Earn more and buy again
  for (let i = 0; i < 58; i++) store.tap(); // Need $57.50
  assert(store.buyBusiness('lemonade', 1), 'Buy second lemonade');
  assertEq(s.businesses['lemonade'], 2, 'Lemonade level is 2');

  // Can't afford third (costs ~$66.12)
  for (let i = 0; i < 60; i++) store.tap(); // $60
  assert(!store.buyBusiness('lemonade', 1), "Can't afford third lemonade with $60");
}

// ---- BUY MULTIPLE ----
console.log('\nBuy Multiple:');
{
  const store = createStore();
  const s = store.get();

  // Give lots of money
  for (let i = 0; i < 1000; i++) store.tap();

  // Buy 5 lemonades at once
  const cost5 = calculateBusinessCost(s, 'lemonade', 5);
  assert(s.money >= cost5, `Have enough for 5 lemonades (need $${cost5.toFixed(2)}, have $${s.money})`);
  assert(store.buyBusiness('lemonade', 5), 'Buy 5 lemonades at once');
  assertEq(s.businesses['lemonade'], 5, 'Lemonade level is 5');
}

// ---- GAME TICK ----
console.log('\nGame Tick (Passive Income):');
{
  const store = createStore();
  const s = store.get();

  // No income with no businesses
  store.tick(1);
  assertEq(s.money, 0, 'No income without businesses');

  // Buy a lemonade stand manually
  s.money = 50;
  s.totalEarned = 50;
  store.buyBusiness('lemonade', 1);

  const incomeBefore = calculateIncomePerSecond(s);
  assertEq(incomeBefore, 1, 'Lemonade stand earns $1/s');

  // Tick 1 second
  const moneyBefore = s.money;
  store.tick(1);
  assertClose(s.money - moneyBefore, 1, 0.01, 'Earns $1 in 1 second');

  // Tick 10 seconds
  const moneyBefore2 = s.money;
  store.tick(10);
  assertClose(s.money - moneyBefore2, 10, 0.01, 'Earns $10 in 10 seconds');

  // Fractional tick (100ms = 0.1s)
  const moneyBefore3 = s.money;
  store.tick(0.1);
  assertClose(s.money - moneyBefore3, 0.1, 0.01, 'Earns $0.10 in 0.1 seconds');
}

// ---- INCOME SCALING ----
console.log('\nIncome Scaling:');
{
  const store = createStore();
  const s = store.get();

  s.money = 1000000;
  s.totalEarned = 1000000;

  // Buy lemonade to level 10
  for (let i = 0; i < 10; i++) {
    store.buyBusiness('lemonade', 1);
  }

  const income = calculateIncomePerSecond(s);
  assertEq(income, 10, 'Lemonade Lv.10 earns $10/s (1 × 10)');

  // Buy newspaper to level 5
  for (let i = 0; i < 5; i++) {
    store.buyBusiness('newspaper', 1);
  }

  const income2 = calculateIncomePerSecond(s);
  assertEq(income2, 10 + 25, 'Total income: lemon($10) + news($25) = $35/s');
}

// ---- PRESTIGE ----
console.log('\nPrestige:');
{
  const store = createStore();
  const s = store.get();

  // Can't prestige without enough earnings
  assertEq(store.prestige(), 0, "Can't prestige with $0 earned");

  // Give enough total earned
  s.totalEarned = 1_000_000;
  s.money = 500_000;
  s.businesses = { lemonade: 50, newspaper: 20 };
  s.totalTaps = 5000;

  const points = store.prestige();
  assertEq(points, 1, 'Earn 1 prestige point at $1M');
  assertEq(s.prestigePoints, 1, 'Prestige points is 1');
  assertEq(s.totalPrestiges, 1, 'Total prestiges is 1');
  assertEq(s.money, 0, 'Money reset to 0');
  assertEq(s.totalEarned, 0, 'Total earned reset to 0');
  assertEq(s.totalTaps, 0, 'Total taps reset to 0');
  assertEq(Object.keys(s.businesses).length, 0, 'Businesses reset');
  assertEq(s.upgrades.length, 0, 'Upgrades reset');

  // Tap value should now be 1.05x
  const tapValue = calculateTapValue(s);
  assertClose(tapValue, 1.05, 0.001, 'Tap value is $1.05 with 1 PP');
}

// ---- PRESTIGE + INCOME ----
console.log('\nPrestige Income Multiplier:');
{
  const store = createStore();
  const s = store.get();

  s.prestigePoints = 10; // 1.5x multiplier
  s.money = 1000;
  s.totalEarned = 1000;
  store.buyBusiness('lemonade', 1);

  const income = calculateIncomePerSecond(s);
  assertClose(income, 1.5, 0.01, 'Lemonade Lv.1 with 10 PP earns $1.50/s');
}

// ---- BOOST ----
console.log('\nBoost:');
{
  const store = createStore();
  const s = store.get();

  assertEq(s.boostEndTime, 0, 'No boost initially');
  store.activateBoost();
  assert(s.boostEndTime > Date.now(), 'Boost end time is in the future');
  assert(s.boostEndTime <= Date.now() + 120 * 60 * 1000 + 1000, 'Boost duration is ~2 hours');
}

// ---- RESET ----
console.log('\nReset:');
{
  const store = createStore();
  const s = store.get();

  // Build up state
  for (let i = 0; i < 100; i++) store.tap();
  store.buyBusiness('lemonade', 1);
  store.tick(10);

  assert(s.money > 0, 'Has money before reset');
  assert(s.totalTaps > 0, 'Has taps before reset');

  store.resetAll();
  assertEq(s.money, 0, 'Money reset to 0');
  assertEq(s.totalEarned, 0, 'Total earned reset to 0');
  assertEq(s.totalTaps, 0, 'Total taps reset to 0');
  assertEq(s.totalPrestiges, 0, 'Total prestiges reset to 0');
  assertEq(s.prestigePoints, 0, 'Prestige points reset to 0');
  assertEq(Object.keys(s.businesses).length, 0, 'Businesses reset');
}

// ---- EDGE CASES ----
console.log('\nEdge Cases:');
{
  const store = createStore();
  const s = store.get();

  // Buy nonexistent business
  s.money = 1000000;
  assert(!store.buyBusiness('nonexistent', 1), "Can't buy nonexistent business");
  assertEq(s.money, 1000000, 'Money unchanged after failed buy');

  // Buy 0 of a business (should succeed, cost $0)
  assert(store.buyBusiness('lemonade', 0), 'Buy 0 lemonades succeeds');
  assertEq(s.businesses['lemonade'], 0, 'Lemonade level is 0');
  assertEq(s.money, 1000000, 'Money unchanged buying 0');

  // Tick with 0 delta
  const moneyBefore = s.money;
  store.tick(0);
  assertEq(s.money, moneyBefore, 'Tick with dt=0 adds nothing');

  // Negative money prevention (can't go negative through normal means)
  s.money = 0;
  assert(!store.buyBusiness('lemonade', 1), "Can't buy with $0");
  assertEq(s.money, 0, "Money doesn't go negative");
}

// ---- GAME FLOW SIMULATION ----
console.log('\nFull Game Flow Simulation:');
{
  const store = createStore();
  const s = store.get();

  // Simulate 50 taps
  for (let i = 0; i < 50; i++) store.tap();
  assertEq(s.money, 50, 'Earned $50 from tapping');

  // Buy first business
  assert(store.buyBusiness('lemonade', 1), 'Buy first lemonade');

  // Simulate 30 seconds of gameplay
  for (let i = 0; i < 300; i++) { // 300 ticks at 0.1s = 30 seconds
    store.tick(0.1);
    if (i % 10 === 0) store.tap(); // Tap once per second
  }

  assert(s.money > 30, 'Earned from passive income + tapping over 30 seconds');
  assert(s.timePlayed >= 29.9 && s.timePlayed <= 30.1, 'Time played tracks correctly');
  assertEq(s.sessions, 0, 'Sessions unchanged (not incremented in this test)');

  console.log(`    Final balance: $${s.money.toFixed(2)}`);
  console.log(`    Total earned: $${s.totalEarned.toFixed(2)}`);
  console.log(`    Total taps: ${s.totalTaps}`);
  console.log(`    Time played: ${s.timePlayed.toFixed(1)}s`);
}

// ========== SUMMARY ==========

console.log('\n\n========================================');
console.log(`📊 STORE RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failures.length > 0) {
  console.log('\n❌ Failures:');
  failures.forEach(f => console.log(`  - ${f}`));
}

process.exit(failed > 0 ? 1 : 0);
