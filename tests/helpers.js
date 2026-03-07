// Shared test helpers for Tap Tycoon tests

const TEST_EMAIL = 'scrolltest@taptycoon.com';
const TEST_PASSWORD = 'test123456';

/**
 * Sign in with the test account. Handles both sign-in and sign-up flows.
 * After this call the game screen ("Your Businesses") is visible and
 * any startup modals (offline earnings, daily reward) are dismissed.
 */
async function signIn(page) {
  await page.goto('/', { waitUntil: 'networkidle' });

  await page.fill('input[placeholder="Email"]', TEST_EMAIL);
  await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
  await page.getByText('Sign In').last().click();

  const loaded = await page.waitForSelector('text=Your Businesses', { timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (!loaded) {
    // Account may not exist yet — sign up
    await page.getByText("Don't have an account?").click();
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Email"]', TEST_EMAIL);
    await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
    await page.getByText('Sign Up').last().click();
    await page.waitForSelector('text=Your Businesses', { timeout: 10000 });
  }

  // Dismiss startup modals that block all clicks (offline earnings, daily reward)
  await dismissStartupModals(page);
}

/**
 * Dismiss offline earnings and daily reward modals that appear on game load.
 * These overlay the entire screen and block all clicks if not dismissed.
 */
async function dismissStartupModals(page) {
  // Wait briefly for modals to appear
  await page.waitForTimeout(800);

  // Dismiss offline earnings modal ("Collect" button)
  try {
    const collect = page.getByText('Collect');
    if (await collect.isVisible({ timeout: 500 })) {
      await collect.evaluate(el => el.click());
      await page.waitForTimeout(400);
    }
  } catch {}

  // Dismiss daily reward modal ("Claim Reward" button)
  try {
    const claim = page.getByText('Claim Reward');
    if (await claim.isVisible({ timeout: 500 })) {
      await claim.evaluate(el => el.click());
      await page.waitForTimeout(400);
    }
  } catch {}
}

/**
 * Click a React Native Web element using real mouse coordinates.
 * React Native Web's synthetic event system requires coordinate-based
 * clicks — element.click() with force:true is not sufficient because
 * React dispatches events based on the actual mouse position.
 */
async function rnClick(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Element has no bounding box: ${locator}`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/**
 * Find the first scrollable div on the page that has overflow content.
 */
async function findScrollable(page) {
  return page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    for (let i = 0; i < divs.length; i++) {
      const d = divs[i];
      const s = window.getComputedStyle(d);
      if (
        (s.overflowY === 'scroll' || s.overflowY === 'auto') &&
        d.scrollHeight > d.clientHeight + 5 &&
        d.clientHeight > 0
      ) {
        return { index: i, scrollHeight: d.scrollHeight, clientHeight: d.clientHeight };
      }
    }
    return null;
  });
}

module.exports = { signIn, rnClick, findScrollable, dismissStartupModals, TEST_EMAIL, TEST_PASSWORD };
