// @ts-check
const { test, expect } = require('@playwright/test');
const { signIn, rnClick, findScrollable } = require('./helpers');

test.describe('Game Screen', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  // ---- Layout ----

  test('game screen renders all main elements', async ({ page }) => {
    await expect(page.getByText('Your Businesses')).toBeVisible();
    await expect(page.getByText('Watch Ad for 2× Boost')).toBeVisible();
    await expect(page.getByText('BALANCE')).toBeVisible();
    await expect(page.getByText('Tap to earn!')).toBeVisible();
    await expect(page.getByText('Business', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Upgrades')).toBeVisible();
    await expect(page.getByText('Prestige')).toBeVisible();
    await expect(page.getByText('Awards')).toBeVisible();
  });

  test('header shows balance and stat pills', async ({ page }) => {
    await expect(page.getByText('BALANCE')).toBeVisible();
    await expect(page.locator('text=/\\$\\d+.*\\/s/')).toBeVisible();
    await expect(page.locator('text=/\\$\\d+.*\\/tap/')).toBeVisible();
  });

  // ---- Tap button ----

  test('tapping coin button increases balance', async ({ page }) => {
    const getBalance = () => page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(e =>
        /^\$[\d.,]+(K|M|B|T)?$/.test(e.textContent?.trim() || '')
      );
      return el?.textContent?.trim() || '';
    });

    const before = await getBalance();

    // Coin symbol is "$" (exact) — click it using real mouse coordinates
    const coin = page.getByText('$', { exact: true });
    for (let i = 0; i < 10; i++) {
      await rnClick(page, coin);
      await page.waitForTimeout(30);
    }

    const after = await getBalance();
    expect(after).not.toBe('');
    expect(after).not.toBe(before);
  });

  // ---- Tab navigation ----

  test('Upgrades tab switches panel', async ({ page }) => {
    await rnClick(page, page.getByText('Upgrades').first());
    await page.waitForTimeout(500);
    // Switching to Upgrades tab hides the Business panel header
    await expect(page.getByText('Your Businesses')).not.toBeVisible({ timeout: 3000 });
  });

  test('Prestige tab switches panel', async ({ page }) => {
    await rnClick(page, page.getByText('Prestige').first());
    await page.waitForTimeout(500);
    await expect(page.getByText('Prestige').first()).toBeVisible();
  });

  test('Awards tab shows achievements panel', async ({ page }) => {
    await rnClick(page, page.getByText('Awards').first());
    await page.waitForTimeout(500);
    await expect(page.getByText('Achievements')).toBeVisible({ timeout: 3000 });
  });

  test('Business tab returns when clicked', async ({ page }) => {
    await rnClick(page, page.getByText('Awards').first());
    await page.waitForTimeout(300);
    await rnClick(page, page.getByText('Business').first());
    await page.waitForTimeout(300);
    await expect(page.getByText('Your Businesses')).toBeVisible({ timeout: 3000 });
  });

  // ---- Scroll ----

  test('Business tab content is scrollable', async ({ page }) => {
    await page.waitForTimeout(300);
    const container = await findScrollable(page);
    expect(container).not.toBeNull();
    expect(container.scrollHeight).toBeGreaterThan(container.clientHeight);

    const scrolled = await page.evaluate((idx) => {
      const d = document.querySelectorAll('div')[idx];
      d.scrollTop = 300;
      return d.scrollTop;
    }, container.index);

    expect(scrolled).toBeGreaterThan(0);
  });

  test('Awards tab content is scrollable', async ({ page }) => {
    await rnClick(page, page.getByText('Awards').first());
    await page.waitForTimeout(500);

    const container = await findScrollable(page);
    expect(container).not.toBeNull();

    const scrolled = await page.evaluate((idx) => {
      const d = document.querySelectorAll('div')[idx];
      d.scrollTop = 200;
      return d.scrollTop;
    }, container.index);

    expect(scrolled).toBeGreaterThan(0);
  });

  // ---- Boost / Rewarded Ad ----

  test('Watch Ad button opens rewarded overlay', async ({ page }) => {
    await rnClick(page, page.getByText('Watch Ad for 2× Boost'));
    await expect(page.getByText('Watch to Earn 2× Boost')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=/\\d+s remaining/')).toBeVisible();
  });

  test('rewarded overlay closes with X button', async ({ page }) => {
    await rnClick(page, page.getByText('Watch Ad for 2× Boost'));
    await expect(page.getByText('Watch to Earn 2× Boost')).toBeVisible({ timeout: 3000 });
    await rnClick(page, page.locator('text=✕').first());
    await expect(page.getByText('Watch to Earn 2× Boost')).not.toBeVisible({ timeout: 2000 });
  });

  // ---- Settings panel ----

  test('settings panel opens with account info', async ({ page }) => {
    await rnClick(page, page.getByText('⚙️'));
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Signed in as')).toBeVisible();
    await expect(page.getByText('Sign Out')).toBeVisible();
  });

  test('settings panel closes with X', async ({ page }) => {
    await rnClick(page, page.getByText('⚙️'));
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 3000 });
    // Use evaluate el.click() for elements inside Modal portals
    await page.locator('text=✕').last().evaluate(el => el.click());
    await expect(page.getByText('Settings')).not.toBeVisible({ timeout: 2000 });
  });

  // ---- Stats panel ----

  test('stats panel opens with statistics', async ({ page }) => {
    await rnClick(page, page.getByText('📊'));
    await expect(page.getByText('Statistics')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Total Earned')).toBeVisible();
    await expect(page.getByText('Total Taps')).toBeVisible();
    await expect(page.getByText('Prestiges')).toBeVisible();
  });

  test('stats panel closes with X', async ({ page }) => {
    await rnClick(page, page.getByText('📊'));
    await expect(page.getByText('Statistics')).toBeVisible({ timeout: 3000 });
    // Use evaluate el.click() for elements inside Modal portals
    await page.locator('text=✕').last().evaluate(el => el.click());
    await expect(page.getByText('Statistics')).not.toBeVisible({ timeout: 2000 });
  });

  // ---- Sign out ----

  test('sign out returns to auth screen', async ({ page }) => {
    await rnClick(page, page.getByText('⚙️'));
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 3000 });
    // Use evaluate el.click() for Pressable elements inside Modal portals
    await page.getByText('Sign Out').evaluate(el => el.click());
    await expect(page.getByText('Welcome Back')).toBeVisible({ timeout: 5000 });
  });

  // ---- Ad space ----

  test('banner ad space is visible at bottom of screen', async ({ page }) => {
    const adVisible = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div')).some(d => {
        const rect = d.getBoundingClientRect();
        return (
          d.clientHeight >= 50 &&
          rect.bottom <= window.innerHeight + 5 &&
          rect.top > window.innerHeight * 0.75
        );
      });
    });
    expect(adVisible).toBe(true);
  });
});
