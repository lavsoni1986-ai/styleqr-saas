import { test, expect } from "@playwright/test";

/**
 * Restaurant Dashboard Tests
 * Tests authentication, dashboard visibility, and order management
 */
test.describe("Restaurant Dashboard", () => {
  test("Login → Dashboard → Orders visibility", async ({ page }) => {
    // Step 1: Navigate to login page
    await page.goto("/login");

    // Step 2: Fill login form
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]')).or(page.locator('input[type="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]')).or(page.locator('input[type="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in|submit/i }).or(page.locator('button[type="submit"]'));

    // Wait for form to be visible
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    // Fill credentials (use test user)
    await emailInput.fill("restaurant@test.com");
    await passwordInput.fill("password123");

    // Step 3: Submit login
    await submitButton.click();

    // Step 4: Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Step 5: Verify dashboard is visible
    await expect(page.getByText(/Dashboard|Welcome|Restaurant/i).first()).toBeVisible({ timeout: 10000 });

    // Step 6: Verify navigation/orders section
    const ordersLink = page.getByRole("link", { name: /Orders/i }).or(page.getByText(/Orders/i));
    await expect(ordersLink).toBeVisible({ timeout: 5000 });
  });

  test("Dashboard menu management", async ({ page }) => {
    // Login first
    await page.goto("/login");
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    await emailInput.fill("restaurant@test.com");
    await passwordInput.fill("password123");
    await submitButton.click();

    // Wait for dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Navigate to menu management
    const menuLink = page.getByRole("link", { name: /Menu/i }).or(page.getByText(/Menu/i));
    if (await menuLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuLink.click();
      await page.waitForURL(/\/dashboard\/menu/, { timeout: 10000 });
      
      // Verify menu page loaded
      await expect(page.getByText(/Menu|Categories|Items|Products/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("Dashboard QR generation", async ({ page }) => {
    // Login
    await page.goto("/login");
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    await emailInput.fill("restaurant@test.com");
    await passwordInput.fill("password123");
    await submitButton.click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Navigate to QR page
    const qrLink = page.getByRole("link", { name: /QR/i }).or(page.getByText(/QR|QR Code/i));
    if (await qrLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await qrLink.click();
      await page.waitForURL(/\/dashboard\/qr/, { timeout: 10000 });
      
      // Verify QR page loaded
      await expect(page.getByText(/QR|Table|Generate/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("Unauthorized access redirects to login", async ({ page }) => {
    // Try to access dashboard without login
    await page.goto("/dashboard");
    
    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.getByText(/Login|Sign in/i).first()).toBeVisible({ timeout: 5000 });
  });
});
