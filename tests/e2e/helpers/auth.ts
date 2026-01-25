import { Page, APIRequestContext } from '@playwright/test';

export async function loginAsOwner(page: Page, email = 'owner@test.com', password = 'password123') {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();

  if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submitButton.click();
    await page.waitForURL(url => !url.toString().includes('/login') || url.toString().includes('/dashboard'), { timeout: 5000 }).catch(() => {});
  }
}

export async function saveAuthState(page: Page, path: string) {
  await page.context().storageState({ path });
}

export async function createTestUser(request: APIRequestContext, email: string, password: string) {
  try {
    await request.post('http://localhost:3000/api/auth/signup', {
      data: { email, password, name: 'Test Owner', role: 'RESTAURANT_OWNER' },
    });
  } catch (error) {
    // User might already exist
  }
}
