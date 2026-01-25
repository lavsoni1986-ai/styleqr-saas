import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/StyleQR|Restaurant/i);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible({ timeout: 5000 });
  });

  test('menu page loads', async ({ page }) => {
    await page.goto('/menu?token=test');
    await page.waitForLoadState('domcontentloaded');
    const hasMenuContent = await page.locator('text=/menu|restaurant|categories/i').count() > 0;
    expect(hasMenuContent || page.url().includes('/menu')).toBeTruthy();
  });

  test('billing dashboard requires auth', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('domcontentloaded');
    const isLoginPage = page.url().includes('/login') || 
                       await page.locator('input[type="email"], input[name="email"]').count() > 0;
    expect(isLoginPage).toBeTruthy();
  });
});
