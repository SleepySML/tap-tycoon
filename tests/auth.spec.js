// @ts-check
const { test, expect } = require('@playwright/test');
const { TEST_EMAIL, TEST_PASSWORD, rnClick, dismissStartupModals } = require('./helpers');

test.describe('Authentication', () => {
  test('shows auth screen on first load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });

  test('shows sign up form when toggled', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByText("Don't have an account?").click();
    await expect(page.getByText('Create Account')).toBeVisible();
    await expect(page.getByText('Sign Up to start your journey').or(
      page.getByText('Sign up to start your journey')
    )).toBeVisible();
  });

  test('shows error on wrong password', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="Email"]', TEST_EMAIL);
    await page.fill('input[placeholder="Password"]', 'wrongpassword');
    await page.getByText('Sign In').last().click();
    // Should show an error message, not navigate to game
    await page.waitForTimeout(3000);
    await expect(page.getByText('Your Businesses')).not.toBeVisible();
  });

  test('signs in successfully with valid credentials', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="Email"]', TEST_EMAIL);
    await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
    await page.getByText('Sign In').last().click();
    await expect(page.getByText('Your Businesses')).toBeVisible({ timeout: 10000 });
  });

  test('signs out and returns to auth screen', async ({ page }) => {
    // Sign in first
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="Email"]', TEST_EMAIL);
    await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
    await page.getByText('Sign In').last().click();
    await expect(page.getByText('Your Businesses')).toBeVisible({ timeout: 10000 });
    await dismissStartupModals(page);

    // Open settings and sign out
    await rnClick(page, page.getByText('⚙️'));
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 3000 });
    // Use evaluate el.click() for Pressable elements inside Modal portals
    await page.getByText('Sign Out').evaluate(el => el.click());
    await expect(page.getByText('Welcome Back')).toBeVisible({ timeout: 5000 });
  });
});
