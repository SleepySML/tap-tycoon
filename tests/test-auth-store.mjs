// ============================================
// TAP TYCOON — Auth Store Unit Tests
//
// Tests the auth store logic, selectors, and
// the isSupabaseConfigured guard in isolation.
//
// Run: node tests/test-auth-store.mjs
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
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    failures.push(`${testName} (got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)})`);
    console.log(`  ✗ ${testName} — got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)}`);
  }
}

// ---- Simulated Auth Store ----

function createAuthStore() {
  const state = {
    user: null,
    session: null,
    isLoading: true,
    isInitialized: false,
  };

  return {
    get: () => state,

    setSession: (session) => {
      state.session = session;
      state.user = session?.user ?? null;
      state.isLoading = false;
    },

    setLoading: (isLoading) => {
      state.isLoading = isLoading;
    },

    setInitialized: () => {
      state.isInitialized = true;
      state.isLoading = false;
    },
  };
}

// ---- Selectors (from authStore.ts) ----

function selectIsAuthenticated(s) {
  return s.user != null && !s.user.is_anonymous;
}

function selectIsAnonymous(s) {
  return s.user?.is_anonymous === true;
}

function selectDisplayName(s) {
  if (!s.user) return 'Guest';
  const meta = s.user.user_metadata;
  return meta?.full_name || meta?.name || meta?.email?.split('@')[0] || 'Player';
}

function selectAvatarUrl(s) {
  return s.user?.user_metadata?.avatar_url ?? null;
}

// ---- isSupabaseConfigured ----

function isSupabaseConfigured(url, key) {
  return !url.includes('YOUR_PROJECT_ID') && !key.includes('YOUR_SUPABASE_ANON_KEY');
}

// ---- Mock User Data ----

function makeGoogleUser() {
  return {
    id: 'user-123',
    is_anonymous: false,
    user_metadata: {
      full_name: 'John Player',
      name: 'John',
      email: 'john@gmail.com',
      avatar_url: 'https://lh3.googleusercontent.com/a/photo123',
    },
  };
}

function makeEmailUser() {
  return {
    id: 'user-456',
    is_anonymous: false,
    user_metadata: {
      email: 'player@taptycoon.com',
    },
  };
}

function makeAnonymousUser() {
  return {
    id: 'anon-789',
    is_anonymous: true,
    user_metadata: {},
  };
}

function makeSession(user) {
  return {
    user,
    access_token: 'fake-token',
    refresh_token: 'fake-refresh',
    expires_in: 3600,
  };
}

// ========== TESTS ==========

console.log('\n🔐 AUTH STORE UNIT TESTS');
console.log('========================\n');

// ---- Initial State ----
console.log('Initial State:');
{
  const store = createAuthStore();
  const s = store.get();

  assertEq(s.user, null, 'user is null initially');
  assertEq(s.session, null, 'session is null initially');
  assertEq(s.isLoading, true, 'isLoading is true initially');
  assertEq(s.isInitialized, false, 'isInitialized is false initially');
}

// ---- setInitialized (no Supabase) ----
console.log('\nsetInitialized (offline mode):');
{
  const store = createAuthStore();
  const s = store.get();

  store.setInitialized();
  assertEq(s.isInitialized, true, 'isInitialized becomes true');
  assertEq(s.isLoading, false, 'isLoading becomes false');
  assertEq(s.user, null, 'user remains null');
  assertEq(s.session, null, 'session remains null');
}

// ---- setSession (Google sign-in) ----
console.log('\nsetSession (Google sign-in):');
{
  const store = createAuthStore();
  const s = store.get();

  const user = makeGoogleUser();
  const session = makeSession(user);

  store.setSession(session);

  assertEq(s.session, session, 'session is set');
  assertEq(s.user, user, 'user extracted from session');
  assertEq(s.isLoading, false, 'isLoading becomes false');
  assertEq(s.user.id, 'user-123', 'user id correct');
}

// ---- setSession (Email sign-in) ----
console.log('\nsetSession (Email sign-in):');
{
  const store = createAuthStore();
  const s = store.get();

  const user = makeEmailUser();
  const session = makeSession(user);

  store.setSession(session);

  assertEq(s.user.id, 'user-456', 'email user id correct');
  assertEq(s.user.is_anonymous, false, 'email user is not anonymous');
}

// ---- setSession (null = sign out) ----
console.log('\nsetSession (sign out):');
{
  const store = createAuthStore();
  const s = store.get();

  // First sign in
  store.setSession(makeSession(makeGoogleUser()));
  assert(s.user !== null, 'user is set after sign-in');

  // Then sign out
  store.setSession(null);
  assertEq(s.user, null, 'user is null after sign-out');
  assertEq(s.session, null, 'session is null after sign-out');
  assertEq(s.isLoading, false, 'isLoading is false after sign-out');
}

// ---- setLoading ----
console.log('\nsetLoading:');
{
  const store = createAuthStore();
  const s = store.get();

  store.setLoading(false);
  assertEq(s.isLoading, false, 'setLoading(false) works');

  store.setLoading(true);
  assertEq(s.isLoading, true, 'setLoading(true) works');
}

// ---- Selectors: selectIsAuthenticated ----
console.log('\nselectIsAuthenticated:');
{
  assert(!selectIsAuthenticated({ user: null }), 'null user = not authenticated');
  assert(!selectIsAuthenticated({ user: makeAnonymousUser() }), 'anonymous user = not authenticated');
  assert(selectIsAuthenticated({ user: makeGoogleUser() }), 'Google user = authenticated');
  assert(selectIsAuthenticated({ user: makeEmailUser() }), 'Email user = authenticated');
}

// ---- Selectors: selectIsAnonymous ----
console.log('\nselectIsAnonymous:');
{
  assert(!selectIsAnonymous({ user: null }), 'null user = not anonymous');
  assert(selectIsAnonymous({ user: makeAnonymousUser() }), 'anonymous user = is anonymous');
  assert(!selectIsAnonymous({ user: makeGoogleUser() }), 'Google user = not anonymous');
  assert(!selectIsAnonymous({ user: makeEmailUser() }), 'Email user = not anonymous');
}

// ---- Selectors: selectDisplayName ----
console.log('\nselectDisplayName:');
{
  assertEq(selectDisplayName({ user: null }), 'Guest', 'null user = "Guest"');
  assertEq(
    selectDisplayName({ user: makeGoogleUser() }),
    'John Player',
    'Google user = full_name "John Player"'
  );
  assertEq(
    selectDisplayName({ user: makeEmailUser() }),
    'player',
    'Email user = email prefix "player"'
  );
  assertEq(
    selectDisplayName({ user: makeAnonymousUser() }),
    'Player',
    'Anonymous user = fallback "Player"'
  );

  // Edge case: user with only name (no full_name)
  const nameOnlyUser = {
    id: 'u1', is_anonymous: false,
    user_metadata: { name: 'Jane', email: 'jane@test.com' },
  };
  assertEq(
    selectDisplayName({ user: nameOnlyUser }),
    'Jane',
    'User with only name = "Jane"'
  );

  // Edge case: user with empty metadata
  const emptyMetaUser = {
    id: 'u2', is_anonymous: false,
    user_metadata: {},
  };
  assertEq(
    selectDisplayName({ user: emptyMetaUser }),
    'Player',
    'User with empty metadata = "Player"'
  );
}

// ---- Selectors: selectAvatarUrl ----
console.log('\nselectAvatarUrl:');
{
  assertEq(selectAvatarUrl({ user: null }), null, 'null user = null avatar');
  assertEq(
    selectAvatarUrl({ user: makeGoogleUser() }),
    'https://lh3.googleusercontent.com/a/photo123',
    'Google user = avatar URL'
  );
  assertEq(
    selectAvatarUrl({ user: makeEmailUser() }),
    null,
    'Email user = null avatar (no photo)'
  );
  assertEq(
    selectAvatarUrl({ user: makeAnonymousUser() }),
    null,
    'Anonymous user = null avatar'
  );
}

// ---- isSupabaseConfigured ----
console.log('\nisSupabaseConfigured:');
{
  assert(
    !isSupabaseConfigured('https://YOUR_PROJECT_ID.supabase.co', 'YOUR_SUPABASE_ANON_KEY'),
    'Placeholder credentials = not configured'
  );
  assert(
    !isSupabaseConfigured('https://YOUR_PROJECT_ID.supabase.co', 'real-anon-key-12345'),
    'Placeholder URL with real key = not configured'
  );
  assert(
    !isSupabaseConfigured('https://abcdef.supabase.co', 'YOUR_SUPABASE_ANON_KEY'),
    'Real URL with placeholder key = not configured'
  );
  assert(
    isSupabaseConfigured('https://abcdef.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real-key'),
    'Real URL + real key = configured'
  );
}

// ---- Auth State Flow: Full Sign-in/Sign-out Cycle ----
console.log('\nFull Auth State Flow:');
{
  const store = createAuthStore();
  const s = store.get();

  // Step 1: App starts (loading)
  assert(s.isLoading, 'Step 1: loading on start');
  assert(!s.isInitialized, 'Step 1: not initialized');
  assertEq(selectDisplayName(s), 'Guest', 'Step 1: display name is Guest');
  assert(!selectIsAuthenticated(s), 'Step 1: not authenticated');

  // Step 2: No session found → initialized
  store.setInitialized();
  assert(s.isInitialized, 'Step 2: initialized');
  assert(!s.isLoading, 'Step 2: not loading');
  assertEq(selectDisplayName(s), 'Guest', 'Step 2: still Guest');

  // Step 3: User signs in with Google
  store.setLoading(true);
  assert(s.isLoading, 'Step 3: loading during sign-in');

  const googleUser = makeGoogleUser();
  store.setSession(makeSession(googleUser));
  assert(selectIsAuthenticated(s), 'Step 3: authenticated after Google sign-in');
  assert(!selectIsAnonymous(s), 'Step 3: not anonymous');
  assertEq(selectDisplayName(s), 'John Player', 'Step 3: display name from Google');
  assert(selectAvatarUrl(s) !== null, 'Step 3: has avatar');
  assert(!s.isLoading, 'Step 3: not loading after sign-in');

  // Step 4: User signs out
  store.setLoading(true);
  store.setSession(null);
  assert(!selectIsAuthenticated(s), 'Step 4: not authenticated after sign-out');
  assertEq(selectDisplayName(s), 'Guest', 'Step 4: display name is Guest');
  assertEq(selectAvatarUrl(s), null, 'Step 4: no avatar');

  // Step 5: User signs in with email
  const emailUser = makeEmailUser();
  store.setSession(makeSession(emailUser));
  assert(selectIsAuthenticated(s), 'Step 5: authenticated after email sign-in');
  assertEq(selectDisplayName(s), 'player', 'Step 5: display name from email');
  assertEq(selectAvatarUrl(s), null, 'Step 5: email user has no avatar');
}

// ---- Edge: Rapid state changes ----
console.log('\nRapid State Changes:');
{
  const store = createAuthStore();
  const s = store.get();

  // Simulate rapid sign-in/sign-out
  for (let i = 0; i < 10; i++) {
    store.setSession(makeSession(makeGoogleUser()));
    store.setSession(null);
  }
  assertEq(s.user, null, 'User is null after rapid sign-in/sign-out cycles');
  assertEq(s.session, null, 'Session is null after rapid cycles');

  // Final sign-in should stick
  store.setSession(makeSession(makeEmailUser()));
  assert(selectIsAuthenticated(s), 'Final sign-in sticks');
  assertEq(s.user.id, 'user-456', 'Correct user after rapid changes');
}

// ---- AuthModal Client Validation Logic ----
console.log('\nAuthModal Validation Logic:');
{
  // Re-implement AuthModal's handleEmail validation
  function validateAuth(email, password) {
    if (!email.trim() || !password.trim()) {
      return 'Please enter both email and password.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return null; // valid
  }

  assertEq(validateAuth('', ''), 'Please enter both email and password.', 'empty both');
  assertEq(validateAuth('test@test.com', ''), 'Please enter both email and password.', 'empty password');
  assertEq(validateAuth('', 'password'), 'Please enter both email and password.', 'empty email');
  assertEq(validateAuth('  ', '  '), 'Please enter both email and password.', 'whitespace only');
  assertEq(validateAuth('test@test.com', 'abc'), 'Password must be at least 6 characters.', 'short password');
  assertEq(validateAuth('test@test.com', '12345'), 'Password must be at least 6 characters.', '5 char password');
  assertEq(validateAuth('test@test.com', '123456'), null, '6 char password = valid');
  assertEq(validateAuth('a@b.c', 'password123'), null, 'minimal email = valid');
  assertEq(validateAuth(' test@test.com ', 'password'), null, 'email with spaces = valid (trimmed)');

  // Edge case: password exactly 6 chars
  assertEq(validateAuth('test@test.com', 'abcdef'), null, 'exactly 6 chars = valid');

  // Edge case: very long email and password
  assertEq(
    validateAuth('x'.repeat(100) + '@test.com', 'y'.repeat(100)),
    null,
    'very long credentials = valid'
  );
}

// ========== SUMMARY ==========

console.log('\n\n========================================');
console.log(`📊 AUTH STORE RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failures.length > 0) {
  console.log('\n❌ Failures:');
  failures.forEach(f => console.log(`  - ${f}`));
}

process.exit(failed > 0 ? 1 : 0);
