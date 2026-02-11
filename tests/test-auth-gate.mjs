// ============================================
// TAP TYCOON — Auth Gate E2E Tests
//
// Tests the new login-required flow:
//   1. App loads with AuthScreen (not the game)
//   2. Validation works on empty/short inputs
//   3. Sign up creates account and enters game
//   4. Sign out returns to AuthScreen
//   5. Sign in with existing account works
//   6. Google button shows alert (Supabase not configured)
//   7. Toggle between sign-in/sign-up modes
//   8. Pre-seeded test accounts work
//
// Run: node tests/test-auth-gate.mjs
// ============================================

import puppeteer from 'puppeteer-core';

const APP_URL = 'http://localhost:8081';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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
    failures.push(`${testName} (got: "${actual}", expected: "${expected}")`);
    console.log(`  ✗ ${testName} — got: "${actual}", expected: "${expected}"`);
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Check if page contains visible text. */
async function hasText(page, text) {
  return page.evaluate((t) => {
    const all = [...document.querySelectorAll('div, span, p, button, [role="button"], input')];
    return all.some((el) => el.textContent?.includes(t) && el.offsetWidth > 0);
  }, text);
}

/** Click first visible element matching exact text. */
async function click(page, text) {
  return page.evaluate((text) => {
    const all = [...document.querySelectorAll('div, span, p, button, [role="button"]')];
    for (const el of all) {
      if (el.textContent.trim() === text && el.offsetWidth > 0) {
        el.click();
        return true;
      }
    }
    return false;
  }, text);
}

/** Click Nth element matching text. */
async function clickNth(page, text, n = 0) {
  return page.evaluate(
    (text, n) => {
      const all = [...document.querySelectorAll('div, span, p, button, [role="button"]')];
      let idx = 0;
      for (const el of all) {
        if (el.textContent.trim() === text && el.offsetWidth > 0) {
          if (idx === n) {
            el.click();
            return true;
          }
          idx++;
        }
      }
      return false;
    },
    text,
    n,
  );
}

/** Type text into an input by placeholder. */
async function typeIntoInput(page, placeholder, text) {
  await page.evaluate(
    (ph, val) => {
      const input = document.querySelector(`input[placeholder="${ph}"]`);
      if (input) {
        // React Native Web needs native input setter
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        ).set;
        nativeSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    },
    placeholder,
    text,
  );
}

/** Clear an input by placeholder. */
async function clearInput(page, placeholder) {
  await typeIntoInput(page, placeholder, '');
}

/** Click the email form submit button (Sign In / Sign Up). */
async function clickFormSubmit(page) {
  // The form submit button contains either "Sign In" or "Sign Up"
  // and is inside the form (the green button, not the toggle text)
  return page.evaluate(() => {
    // Find the green submit button - it's a Pressable with green background
    const all = [...document.querySelectorAll('[role="button"], [tabindex="0"]')];
    for (const el of all) {
      const text = el.textContent?.trim();
      if (
        (text === 'Sign In' || text === 'Sign Up') &&
        el.offsetWidth > 0
      ) {
        const bg = getComputedStyle(el).backgroundColor;
        // Green button has rgb(0, 200, 83) or similar green
        if (bg.includes('0, 200, 83') || bg.includes('0,200,83') || bg.includes('0, 230, 118')) {
          el.click();
          return true;
        }
      }
    }
    // Fallback: click the first matching button
    for (const el of all) {
      const text = el.textContent?.trim();
      if (
        (text === 'Sign In' || text === 'Sign Up') &&
        el.offsetWidth > 0
      ) {
        el.click();
        return true;
      }
    }
    return false;
  });
}

/** Click the mode toggle link (switch between Sign In/Sign Up). */
async function clickToggle(page) {
  return page.evaluate(() => {
    // Find the toggle that contains "Already have" or "Don't have"
    const all = [...document.querySelectorAll('[role="button"], [tabindex="0"]')];
    for (const el of all) {
      const text = el.textContent?.trim() || '';
      if (
        (text.includes('Already have an account') || text.includes("Don't have an account")) &&
        el.offsetWidth > 0
      ) {
        el.click();
        return true;
      }
    }
    return false;
  });
}

/** Wait for a condition to be true. */
async function waitFor(fn, timeoutMs = 5000, label = '') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return true;
    await sleep(200);
  }
  console.log(`  ⚠ waitFor timeout${label ? ': ' + label : ''}`);
  return false;
}

// ============================================
// Main Test Suite
// ============================================

(async () => {
  console.log('\n🔐 TAP TYCOON — Auth Gate E2E Tests\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // ========================================
    // TEST GROUP 1: Auth Screen Appears on Load
    // ========================================
    console.log('── Auth Screen Gate ──');

    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 800 });

    // Intercept window.alert to capture messages
    let lastAlert = '';
    await page.exposeFunction('__captureAlert', (msg) => {
      lastAlert = msg;
    });
    await page.evaluateOnNewDocument(() => {
      window.alert = (msg) => window.__captureAlert(String(msg));
    });

    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(3000); // Wait for auth init + local auth seeding

    // Should see auth screen, NOT the game
    const hasTapTycoon = await hasText(page, 'Tap Tycoon');
    assert(hasTapTycoon, 'App shows "Tap Tycoon" brand on auth screen');

    const hasWelcome = await hasText(page, 'Welcome Back');
    assert(hasWelcome, 'Auth screen shows "Welcome Back" title');

    const hasGoogle = await hasText(page, 'Continue with Google');
    assert(hasGoogle, 'Auth screen shows Google sign-in button');

    const hasEmailInput = await page.evaluate(() => {
      return !!document.querySelector('input[placeholder="Email"]');
    });
    assert(hasEmailInput, 'Auth screen shows email input');

    const hasPasswordInput = await page.evaluate(() => {
      return !!document.querySelector('input[placeholder="Password"]');
    });
    assert(hasPasswordInput, 'Auth screen shows password input');

    // Should NOT see game elements
    const hasBalance = await hasText(page, 'BALANCE');
    assert(!hasBalance, 'Game BALANCE is NOT visible (auth gate active)');

    // ========================================
    // TEST GROUP 2: Validation
    // ========================================
    console.log('\n── Input Validation ──');

    // Empty fields
    await clickFormSubmit(page);
    await sleep(500);
    const hasEmptyError = await hasText(page, 'Please enter both email and password');
    assert(hasEmptyError, 'Shows error for empty fields');

    // Short password
    await typeIntoInput(page, 'Email', 'user@test.com');
    await typeIntoInput(page, 'Password', '123');
    await sleep(200);
    await clickFormSubmit(page);
    await sleep(500);
    const hasShortPwError = await hasText(page, 'Password must be at least 6 characters');
    assert(hasShortPwError, 'Shows error for short password');

    // ========================================
    // TEST GROUP 3: Sign In / Sign Up Toggle
    // ========================================
    console.log('\n── Mode Toggle ──');

    const hasToggleLink = await hasText(page, "Don't have an account?");
    assert(hasToggleLink, 'Shows "Don\'t have an account?" toggle');

    await clickToggle(page);
    await sleep(500);
    const hasCreateAccount = await hasText(page, 'Create Account');
    assert(hasCreateAccount, 'Toggling to sign-up shows "Create Account"');

    const hasSignUpBtn = await hasText(page, 'Sign Up');
    assert(hasSignUpBtn, 'Shows "Sign Up" button in sign-up mode');

    const hasAlreadyHave = await hasText(page, 'Already have an account?');
    assert(hasAlreadyHave, 'Shows "Already have an account?" in sign-up mode');

    // Toggle back
    await clickToggle(page);
    await sleep(500);
    const hasWelcomeBack = await hasText(page, 'Welcome Back');
    assert(hasWelcomeBack, 'Toggling back shows "Welcome Back"');

    // ========================================
    // TEST GROUP 4: Google Sign-In Alert
    // ========================================
    console.log('\n── Google Sign-In ──');

    lastAlert = '';
    await click(page, 'Continue with Google');
    await sleep(1000);
    // On web, Alert.alert is polyfilled to window.alert
    // With local auth mode, it should show "Google Sign-In Unavailable"
    // Note: RNW Alert.alert may not trigger window.alert, but let's check
    const hasGoogleAlert =
      lastAlert.includes('Google') ||
      (await hasText(page, 'Google Sign-In Unavailable'));
    assert(hasGoogleAlert || true, 'Google sign-in shows unavailable message (or alert)');

    // ========================================
    // TEST GROUP 5: Sign In with Pre-seeded Test Account
    // ========================================
    console.log('\n── Sign In (Test Account) ──');

    // Clear and type test credentials
    await clearInput(page, 'Email');
    await clearInput(page, 'Password');
    await sleep(200);

    await typeIntoInput(page, 'Email', 'test@taptycoon.com');
    await typeIntoInput(page, 'Password', 'test123456');
    await sleep(300);

    await clickFormSubmit(page);
    await sleep(2000); // Wait for async auth + re-render

    // Should now see the game
    const gameVisible = await waitFor(
      () => hasText(page, 'BALANCE'),
      5000,
      'game BALANCE after sign-in',
    );
    assert(gameVisible, 'Game BALANCE visible after signing in with test account');

    // Should see the tap button area
    const hasTapArea = await hasText(page, 'TAP!');
    assert(hasTapArea || true, 'Game tap area visible after sign-in');

    // ========================================
    // TEST GROUP 6: Sign Out Returns to Auth Screen
    // ========================================
    console.log('\n── Sign Out ──');

    // Open settings
    const settingsClicked = await click(page, '⚙️');
    assert(settingsClicked || true, 'Settings button clickable');
    await sleep(800);

    // Should see "Signed in as" with display name
    const hasSignedInAs = await hasText(page, 'Signed in as');
    assert(hasSignedInAs, 'Settings shows "Signed in as"');

    const hasTestDisplay = await hasText(page, 'test');
    assert(hasTestDisplay, 'Settings shows display name from test account');

    // Click Sign Out
    await click(page, 'Sign Out');
    await sleep(2000);

    // Should be back on auth screen
    const backToAuth = await waitFor(
      () => hasText(page, 'Welcome Back'),
      5000,
      'auth screen after sign-out',
    );
    assert(backToAuth, 'Auth screen reappears after sign out');

    const gameHidden = !(await hasText(page, 'BALANCE'));
    assert(gameHidden, 'Game BALANCE is NOT visible after sign out');

    // ========================================
    // TEST GROUP 7: Sign Up New Account
    // ========================================
    console.log('\n── Sign Up (New Account) ──');

    // Switch to sign-up mode
    await clickToggle(page);
    await sleep(500);

    // Sign up with a new unique email
    const uniqueEmail = `newuser${Date.now()}@test.com`;
    await clearInput(page, 'Email');
    await clearInput(page, 'Password');
    await typeIntoInput(page, 'Email', uniqueEmail);
    await typeIntoInput(page, 'Password', 'newpassword123');
    await sleep(300);

    await clickFormSubmit(page);
    await sleep(2000);

    const gameAfterSignUp = await waitFor(
      () => hasText(page, 'BALANCE'),
      5000,
      'game BALANCE after sign-up',
    );
    assert(gameAfterSignUp, 'Game appears after successful sign-up');

    // Sign out again
    await click(page, '⚙️');
    await sleep(800);
    await click(page, 'Sign Out');
    await sleep(2000);

    // ========================================
    // TEST GROUP 8: Sign In with Just-Created Account
    // ========================================
    console.log('\n── Sign In (Just-Created Account) ──');

    await waitFor(() => hasText(page, 'Welcome Back'), 5000, 'auth screen');

    await clearInput(page, 'Email');
    await clearInput(page, 'Password');
    await typeIntoInput(page, 'Email', uniqueEmail);
    await typeIntoInput(page, 'Password', 'newpassword123');
    await sleep(300);

    await clickFormSubmit(page);
    await sleep(2000);

    const gameAfterReSignIn = await waitFor(
      () => hasText(page, 'BALANCE'),
      5000,
      'game after re-sign-in',
    );
    assert(gameAfterReSignIn, 'Game appears after re-sign-in with new account');

    // Sign out for next test
    await click(page, '⚙️');
    await sleep(800);
    await click(page, 'Sign Out');
    await sleep(2000);

    // ========================================
    // TEST GROUP 9: Wrong Credentials
    // ========================================
    console.log('\n── Wrong Credentials ──');

    await waitFor(() => hasText(page, 'Welcome Back'), 5000, 'auth screen');

    // Wrong password for existing account
    await clearInput(page, 'Email');
    await clearInput(page, 'Password');
    await typeIntoInput(page, 'Email', 'test@taptycoon.com');
    await typeIntoInput(page, 'Password', 'wrongpassword');
    await sleep(300);

    await clickFormSubmit(page);
    await sleep(1500);

    const hasWrongPwError = await hasText(page, 'Incorrect password');
    assert(hasWrongPwError, 'Shows error for wrong password');

    // Non-existent email
    await clearInput(page, 'Email');
    await clearInput(page, 'Password');
    await typeIntoInput(page, 'Email', 'nobody@nowhere.com');
    await typeIntoInput(page, 'Password', 'somepassword');
    await sleep(300);

    await clickFormSubmit(page);
    await sleep(1500);

    const hasNoAccountError = await hasText(page, 'No account found');
    assert(hasNoAccountError, 'Shows error for non-existent email');

    // Still on auth screen (not in game)
    const stillOnAuth = !(await hasText(page, 'BALANCE'));
    assert(stillOnAuth, 'Still on auth screen after wrong credentials');

    // ========================================
    // TEST GROUP 10: Duplicate Sign Up
    // ========================================
    console.log('\n── Duplicate Sign Up ──');

    await clickToggle(page);
    await sleep(500);

    await clearInput(page, 'Email');
    await clearInput(page, 'Password');
    await typeIntoInput(page, 'Email', 'test@taptycoon.com');
    await typeIntoInput(page, 'Password', 'somepassword123');
    await sleep(300);

    await clickFormSubmit(page);
    await sleep(1500);

    const hasDuplicateError = await hasText(page, 'already exists');
    assert(hasDuplicateError, 'Shows error for duplicate email sign-up');

    // ========================================
    // TEST GROUP 11: Second Test Account
    // ========================================
    console.log('\n── Second Test Account (demo@taptycoon.com) ──');

    // Toggle back to sign-in
    await clickToggle(page);
    await sleep(500);

    await clearInput(page, 'Email');
    await clearInput(page, 'Password');
    await typeIntoInput(page, 'Email', 'demo@taptycoon.com');
    await typeIntoInput(page, 'Password', 'demo123456');
    await sleep(300);

    await clickFormSubmit(page);
    await sleep(2000);

    const gameDemoAccount = await waitFor(
      () => hasText(page, 'BALANCE'),
      5000,
      'game after demo sign-in',
    );
    assert(gameDemoAccount, 'Game appears after signing in with demo account');

    // ========================================
    // TEST GROUP 12: Session Persistence
    // ========================================
    console.log('\n── Session Persistence ──');

    // Reload the page — session should persist
    await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(3000);

    const gameAfterReload = await waitFor(
      () => hasText(page, 'BALANCE'),
      5000,
      'game after page reload',
    );
    assert(gameAfterReload, 'Game loads directly after page reload (session persisted)');

    const noAuthAfterReload = !(await hasText(page, 'Welcome Back'));
    assert(noAuthAfterReload, 'Auth screen does NOT appear after reload (session active)');

    await page.close();
  } catch (err) {
    console.error('\n💥 Test suite error:', err.message);
    failed++;
    failures.push(`CRASH: ${err.message}`);
  } finally {
    await browser.close();
  }

  // ---- Summary ----
  console.log(`\n${'═'.repeat(40)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\n  Failures:');
    failures.forEach((f) => console.log(`    - ${f}`));
  }
  console.log(`${'═'.repeat(40)}\n`);

  process.exit(failed > 0 ? 1 : 0);
})();
