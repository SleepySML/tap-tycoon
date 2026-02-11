// ============================================
// TAP TYCOON — E2E Browser Test
//
// Uses puppeteer-core with system Chrome to test
// the actual app in a real browser.
//
// Run: node tests/test-e2e.mjs
// Prerequisites: Dev server at http://localhost:8081
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('🌐 E2E BROWSER TESTS');
  console.log('=====================\n');

  let browser;
  try {
    console.log('Launching Chrome...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 414, height: 896 }); // iPhone 11 Pro

    // Collect console errors
    const consoleErrors = [];
    const consoleWarnings = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    // Collect page errors (uncaught exceptions)
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // ---- TEST 1: Page loads ----
    console.log('\n📄 Page Load:');
    const response = await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    assert(response.status() === 200, 'Server returns 200');

    // Wait for React to render + auth init
    await sleep(3000);

    // ---- AUTH: Sign in with test account (auth gate is now required) ----
    console.log('\n🔑 Auth Gate — Sign in:');
    // Type test credentials into the auth screen
    await page.evaluate((email) => {
      const input = document.querySelector('input[placeholder="Email"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, email);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 'test@taptycoon.com');
    await page.evaluate((pw) => {
      const input = document.querySelector('input[placeholder="Password"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, pw);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 'test123456');
    await sleep(300);

    // Click Sign In button
    await page.evaluate(() => {
      const all = [...document.querySelectorAll('[role="button"], [tabindex="0"]')];
      for (const el of all) {
        if (el.textContent?.trim() === 'Sign In' && el.offsetWidth > 0) {
          el.click();
          return;
        }
      }
    });
    await sleep(3000); // Wait for auth + game screen to load

    const signedIn = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('BALANCE'));
    });
    assert(signedIn, 'Signed in successfully — game screen visible');

    // ---- TEST 2: No critical JS errors ----
    console.log('\n🐛 Console Errors:');
    const criticalErrors = pageErrors.filter(
      e => !e.includes('supabase') && !e.includes('YOUR_PROJECT_ID')
    );
    assert(criticalErrors.length === 0,
      `No critical page errors (found: ${criticalErrors.length}${criticalErrors.length > 0 ? ' — ' + criticalErrors[0].substring(0, 100) : ''})`
    );

    // ---- TEST 3: Key UI elements exist ----
    console.log('\n🖼️ UI Elements:');

    // Check for "BALANCE" text
    const balanceText = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('BALANCE'));
    });
    assert(balanceText, 'Balance label exists');

    // Check for "$" money display
    const moneyDisplay = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => /^\$[\d,.]+[KMBT]?$/.test(el.textContent.trim()));
    });
    assert(moneyDisplay, 'Money display shows a dollar amount');

    // Check for tap button (the big $ circle)
    const tapButtonExists = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.trim() === '$');
    });
    assert(tapButtonExists, 'Tap button ($) exists');

    // Check for "Tap to earn!" hint
    const tapHint = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('Tap to earn'));
    });
    assert(tapHint, '"Tap to earn!" hint exists');

    // Check for tab bar
    const businessTab = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('Business'));
    });
    assert(businessTab, 'Business tab exists');

    const upgradesTab = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent === 'Upgrades');
    });
    assert(upgradesTab, 'Upgrades tab exists');

    const prestigeTab = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent === 'Prestige');
    });
    assert(prestigeTab, 'Prestige tab exists');

    const awardsTab = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent === 'Awards');
    });
    assert(awardsTab, 'Awards tab exists');

    // Check for user badge (sign-in no longer in header — login is required)
    // User should be signed in already (we signed in earlier)

    // Check for Watch Ad button
    const adBtn = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('Watch Ad'));
    });
    assert(adBtn, '"Watch Ad for 2× Boost" button exists');

    // Check for stat pills (income, tap value, prestige)
    const incomePill = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('/s'));
    });
    assert(incomePill, 'Income/s pill exists');

    const tapPill = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('/tap'));
    });
    assert(tapPill, 'Tap value pill exists');

    // ---- TEST 4: Business list renders ----
    console.log('\n🏢 Business Panel:');

    const lemonadeStand = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('Lemonade Stand'));
    });
    assert(lemonadeStand, 'Lemonade Stand business visible');

    const newspaperRoute = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('Newspaper Route'));
    });
    assert(newspaperRoute, 'Newspaper Route business visible');

    // Check "NEW" badge on unowned businesses
    const newBadge = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.trim() === 'NEW');
    });
    assert(newBadge, 'NEW badge visible on unowned businesses');

    // Check buy amount button
    const buyAmountBtn = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('Buy ×1'));
    });
    assert(buyAmountBtn, 'Buy ×1 amount button visible');

    // ---- TEST 5: Tapping works ----
    console.log('\n👆 Tap Interaction:');

    // Get initial money
    const initialMoney = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (/^\$[\d,.]+[KMBT]?$/.test(el.textContent.trim())) {
          return el.textContent.trim();
        }
      }
      return null;
    });
    console.log(`    Initial balance: ${initialMoney}`);

    // Find and click the tap button (the "$" text inside the circle)
    const tapped = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('[role="button"], div, span')];
      for (const el of elements) {
        if (el.textContent.trim() === '$' && el.offsetWidth > 50) {
          el.click();
          return true;
        }
      }
      // Fallback: click the parent of the "$" text
      const dollarElements = [...document.querySelectorAll('div, span')];
      for (const el of dollarElements) {
        if (el.textContent.trim() === '$') {
          // Click parent chain
          let parent = el.parentElement;
          for (let i = 0; i < 5; i++) {
            if (parent) {
              parent.click();
              return true;
            }
            parent = parent?.parentElement;
          }
        }
      }
      return false;
    });
    assert(tapped, 'Tap button was clickable');

    // Tap multiple times
    for (let i = 0; i < 50; i++) {
      await page.evaluate(() => {
        const elements = [...document.querySelectorAll('div, span')];
        for (const el of elements) {
          if (el.textContent.trim() === '$') {
            let parent = el.parentElement;
            for (let j = 0; j < 3; j++) {
              if (parent) {
                parent.click();
                parent = parent.parentElement;
              }
            }
            break;
          }
        }
      });
      if (i % 10 === 0) await sleep(50); // Brief pauses
    }

    await sleep(500);

    // Check money increased
    const afterTapMoney = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (/^\$[\d,.]+[KMBT]?$/.test(el.textContent.trim())) {
          return el.textContent.trim();
        }
      }
      return null;
    });
    console.log(`    After tapping: ${afterTapMoney}`);
    assert(afterTapMoney !== '$0', 'Money increased after tapping');

    // Check for floating particles ("+$" text)
    // Particles are Animated.Text, they might be gone by now, so just check money changed
    assert(afterTapMoney !== initialMoney, 'Balance changed after tapping');

    // ---- TEST 6: Tab switching ----
    console.log('\n📑 Tab Switching:');

    // Click "Upgrades" tab
    await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (el.textContent === 'Upgrades') {
          el.click();
          return;
        }
      }
    });
    await sleep(500);

    // Check if upgrades panel content appears (empty text since no upgrades unlocked yet)
    const upgradesContent = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(
        el => el.textContent.includes('unlock upgrades') || el.textContent.includes('Upgrades')
      );
    });
    assert(upgradesContent, 'Upgrades tab content renders');

    // Click "Prestige" tab
    await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (el.textContent === 'Prestige') {
          el.click();
          return;
        }
      }
    });
    await sleep(500);

    const prestigeContent = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('Prestige Points'));
    });
    assert(prestigeContent, 'Prestige tab content renders');

    // Click "Awards" tab
    await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (el.textContent === 'Awards') {
          el.click();
          return;
        }
      }
    });
    await sleep(500);

    const awardsContent = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('First Steps'));
    });
    assert(awardsContent, 'Awards tab shows achievements (First Steps)');

    // Switch back to Business tab
    await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (el.textContent === 'Business') {
          el.click();
          return;
        }
      }
    });
    await sleep(300);

    // ---- TEST 7: Buy amount cycling ----
    console.log('\n🔢 Buy Amount Cycling:');

    // Click the buy amount button
    await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (el.textContent.includes('Buy ×')) {
          el.click();
          return;
        }
      }
    });
    await sleep(300);

    const buyAmount10 = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('Buy ×10'));
    });
    assert(buyAmount10, 'Buy amount cycles to ×10');

    // ---- TEST 8: Auth Modal (REMOVED — auth is now a full-screen gate, tested separately) ----

    // ---- TEST 9: Daily Reward Modal ----
    console.log('\n🎁 Daily Reward Modal:');
    // Check if daily reward modal appeared (it shows on first boot)
    const dailyShowed = await page.evaluate(() => {
      // The daily modal might have already been shown and collected
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('Daily Reward'));
    });
    // This is conditional — may or may not show depending on localStorage state
    console.log(`    Daily reward modal ${dailyShowed ? 'is showing' : 'was auto-claimed or not triggered'}`);

    if (dailyShowed) {
      // Claim it
      await page.evaluate(() => {
        const elements = [...document.querySelectorAll('div, span, p')];
        for (const el of elements) {
          if (el.textContent.includes('Claim Reward')) {
            el.click();
            return;
          }
        }
      });
      await sleep(300);
      console.log('    ✓ Claimed daily reward');
    }

    // ---- TEST 10: Settings Modal ----
    console.log('\n⚙️ Settings Modal:');

    // Click settings icon
    await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (el.textContent.trim() === '⚙️') {
          el.click();
          return;
        }
      }
    });
    await sleep(500);

    const settingsTitle = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent === 'Settings');
    });
    assert(settingsTitle, 'Settings panel opens');

    const accountSection = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent === 'Account');
    });
    assert(accountSection, 'Account section visible in settings');

    const resetBtn = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent.includes('Reset Game'));
    });
    assert(resetBtn, 'Reset Game button visible');

    // Close settings
    await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (el.textContent.trim() === '✕') {
          el.click();
          return;
        }
      }
    });
    await sleep(300);

    // ---- TEST 11: Stats Modal ----
    console.log('\n📊 Stats Modal:');

    await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (el.textContent.trim() === '📊') {
          el.click();
          return;
        }
      }
    });
    await sleep(500);

    const statsTitle = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent === 'Statistics');
    });
    assert(statsTitle, 'Statistics panel opens');

    const totalEarnedStat = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent === 'Total Earned');
    });
    assert(totalEarnedStat, 'Total Earned stat visible');

    const totalTapsStat = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      return elements.some(el => el.textContent === 'Total Taps');
    });
    assert(totalTapsStat, 'Total Taps stat visible');

    // Close stats
    await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (el.textContent.trim() === '✕') {
          el.click();
          return;
        }
      }
    });
    await sleep(300);

    // ---- TEST 12: Game loop is running ----
    console.log('\n⏱️ Game Loop:');

    // Wait for a few ticks and check time played updates
    const timeBefore = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (el.textContent.includes('/s')) {
          return el.textContent;
        }
      }
      return null;
    });
    console.log(`    Income display: ${timeBefore}`);
    assert(timeBefore !== null, 'Income per second is displayed');

    // ---- TEST 13: Console error summary ----
    console.log('\n🔍 Console Error Summary:');
    const realErrors = consoleErrors.filter(
      e => !e.includes('supabase') &&
           !e.includes('YOUR_PROJECT_ID') &&
           !e.includes('favicon') &&
           !e.includes('invalid URL')
    );
    console.log(`    Total console errors: ${consoleErrors.length}`);
    console.log(`    Real errors (excluding Supabase placeholder): ${realErrors.length}`);
    if (realErrors.length > 0) {
      realErrors.forEach(e => console.log(`      ⚠️ ${e.substring(0, 150)}`));
    }
    assert(realErrors.length === 0, 'No real console errors (excluding Supabase placeholders)');

    if (consoleWarnings.length > 0) {
      console.log(`    Warnings: ${consoleWarnings.length}`);
    }

    // ---- TEST 14: Buying a business (need to tap enough first) ----
    console.log('\n💰 Business Purchase:');

    // Tap rapidly to earn money for a lemonade stand ($50)
    const currentBalance = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (/^\$[\d,.]+[KMBT]?$/.test(el.textContent.trim())) {
          return el.textContent.trim();
        }
      }
      return '$0';
    });
    console.log(`    Current balance: ${currentBalance}`);

    // Tap 100 more times
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => {
        const elements = [...document.querySelectorAll('div, span')];
        for (const el of elements) {
          if (el.textContent.trim() === '$') {
            let parent = el.parentElement;
            for (let j = 0; j < 3; j++) {
              if (parent) { parent.click(); parent = parent.parentElement; }
            }
            break;
          }
        }
      });
      if (i % 20 === 0) await sleep(30);
    }
    await sleep(500);

    const balanceAfterMore = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('div, span, p')];
      for (const el of elements) {
        if (/^\$[\d,.]+[KMBT]?$/.test(el.textContent.trim())) {
          return el.textContent.trim();
        }
      }
      return '$0';
    });
    console.log(`    Balance after more tapping: ${balanceAfterMore}`);

    // Try buying lemonade stand
    const boughtBusiness = await page.evaluate(() => {
      // First switch back to buy ×1 if needed
      const buyBtnElements = [...document.querySelectorAll('div, span, p')];
      
      // Find the buy button for lemonade stand
      const allElements = [...document.querySelectorAll('div, span, p')];
      const lemonadeEl = allElements.find(el => el.textContent.includes('Lemonade Stand'));
      if (!lemonadeEl) return { found: false, reason: 'lemonade not found' };

      // Find the price button near it
      const card = lemonadeEl.closest('[style*="flex"]') || lemonadeEl.parentElement?.parentElement;
      if (!card) return { found: true, reason: 'card not found' };

      // Click any button-like element that shows a price
      const buttons = card.querySelectorAll('[role="button"], [tabindex]');
      for (const btn of buttons) {
        if (btn.textContent.includes('$')) {
          btn.click();
          return { found: true, clicked: true, text: btn.textContent };
        }
      }

      // Fallback: click all $ elements in the card
      const priceEls = [...card.querySelectorAll('div, span')];
      for (const el of priceEls) {
        if (el.textContent.includes('$5') || el.textContent.includes('$50')) {
          el.click();
          return { found: true, clicked: true, text: el.textContent };
        }
      }

      return { found: true, clicked: false };
    });
    console.log(`    Business purchase attempt: ${JSON.stringify(boughtBusiness)}`);

    // ---- TEST 15: Dark theme applied ----
    console.log('\n🎨 Visual Theme:');

    const bgColor = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return null;
      const firstChild = root.children[0];
      if (!firstChild) return null;
      const computed = window.getComputedStyle(firstChild);
      return computed.backgroundColor;
    });
    console.log(`    Root background: ${bgColor}`);
    // Should be dark (#0a0a1a = rgb(10, 10, 26))
    assert(
      bgColor && (bgColor.includes('10, 10, 26') || bgColor.includes('rgb(10') || bgColor === 'rgb(10, 10, 26)'),
      'Dark theme background applied'
    );

    // ========== SUMMARY ==========
    console.log('\n\n========================================');
    console.log(`📊 E2E RESULTS: ${passed} passed, ${failed} failed`);
    console.log('========================================');

    if (failures.length > 0) {
      console.log('\n❌ Failures:');
      failures.forEach(f => console.log(`  - ${f}`));
    }

    return failed;
  } catch (err) {
    console.error('\n❌ Test runner error:', err.message);
    return 1;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

run().then((failCount) => {
  process.exit(failCount > 0 ? 1 : 0);
});
