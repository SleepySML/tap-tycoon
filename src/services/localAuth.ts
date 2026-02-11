// ============================================
// TAP TYCOON — Local Auth Service
//
// AsyncStorage-backed authentication for development
// and demo mode (when Supabase is not configured).
//
// Features:
//   - Email/password registration and login
//   - SHA-256 password hashing with per-user salt
//   - Session persistence across app restarts
//   - Pre-seeded test accounts
//
// Storage keys:
//   tap-tycoon-users   → Record<email, UserRecord>
//   tap-tycoon-session  → { userId, email } | null
//
// When Supabase IS configured, this service is unused.
// The useAuth hook routes to Supabase instead.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// ---- Types ----

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

/** User object shape compatible with authStore (mirrors Supabase User). */
export interface LocalUser {
  id: string;
  is_anonymous: boolean;
  user_metadata: {
    email: string;
    full_name?: string;
  };
}

/** Session object shape compatible with authStore (mirrors Supabase Session). */
export interface LocalSession {
  user: LocalUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ---- Constants ----

const USERS_KEY = 'tap-tycoon-users';
const SESSION_KEY = 'tap-tycoon-session';

/** Pre-seeded test accounts (created on first initialize). */
const TEST_ACCOUNTS = [
  { email: 'test@taptycoon.com', password: 'test123456' },
  { email: 'demo@taptycoon.com', password: 'demo123456' },
];

// ---- Helpers ----

/** Generate a random hex string (for IDs and salts). */
async function randomHex(bytes: number): Promise<string> {
  const uuid = Crypto.randomUUID();
  // Use UUID + timestamp for sufficient randomness
  const raw = uuid.replace(/-/g, '') + Date.now().toString(16);
  return raw.substring(0, bytes * 2);
}

/** Hash a password with a salt using SHA-256. */
async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salt + password,
  );
}

/** Load users map from AsyncStorage. */
async function loadUsers(): Promise<Record<string, UserRecord>> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : {};
}

/** Save users map to AsyncStorage. */
async function saveUsers(users: Record<string, UserRecord>): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Build a LocalUser from a UserRecord. */
function toLocalUser(record: UserRecord): LocalUser {
  return {
    id: record.id,
    is_anonymous: false,
    user_metadata: {
      email: record.email,
      full_name: record.email.split('@')[0],
    },
  };
}

/** Build a LocalSession from a LocalUser. */
function toLocalSession(user: LocalUser): LocalSession {
  return {
    user,
    access_token: `local-${user.id}-${Date.now()}`,
    refresh_token: `local-refresh-${user.id}`,
    expires_in: 86400,
  };
}

// ---- Public API ----

/**
 * Initialize local auth: seed test accounts if not present.
 * Call once at app startup.
 */
export async function initialize(): Promise<void> {
  const users = await loadUsers();
  let changed = false;

  for (const { email, password } of TEST_ACCOUNTS) {
    if (!users[email]) {
      const salt = await randomHex(16);
      const passwordHash = await hashPassword(password, salt);
      users[email] = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        email,
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
      };
      changed = true;
    }
  }

  if (changed) {
    await saveUsers(users);
  }
}

/**
 * Sign up a new user with email and password.
 * Returns a session on success, or throws on error.
 */
export async function signUp(
  email: string,
  password: string,
): Promise<LocalSession> {
  const normalized = email.toLowerCase().trim();

  const users = await loadUsers();
  if (users[normalized]) {
    throw new Error('An account with this email already exists.');
  }

  const salt = await randomHex(16);
  const passwordHash = await hashPassword(password, salt);
  const record: UserRecord = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: normalized,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };

  users[normalized] = record;
  await saveUsers(users);

  const user = toLocalUser(record);
  const session = toLocalSession(user);

  // Persist session
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: record.id, email: normalized }));

  return session;
}

/**
 * Sign in with email and password.
 * Returns a session on success, or throws on error.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<LocalSession> {
  const normalized = email.toLowerCase().trim();

  const users = await loadUsers();
  const record = users[normalized];
  if (!record) {
    throw new Error('No account found with this email.');
  }

  const hash = await hashPassword(password, record.salt);
  if (hash !== record.passwordHash) {
    throw new Error('Incorrect password.');
  }

  const user = toLocalUser(record);
  const session = toLocalSession(user);

  // Persist session
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: record.id, email: normalized }));

  return session;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/**
 * Restore a session from AsyncStorage.
 * Returns a session if one exists, or null.
 */
export async function getSession(): Promise<LocalSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  const { email } = JSON.parse(raw);
  const users = await loadUsers();
  const record = users[email];
  if (!record) {
    // Stale session — user was deleted
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }

  return toLocalSession(toLocalUser(record));
}
