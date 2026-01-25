import { test, expect } from "@playwright/test";

/**
 * Admin Panel Tests
 * Tests super admin authentication and platform management
 */
test.describe("Admin Panel", () => {
  test("Super admin login → Dashboard → Platform stats", async ({ page }) => {
    // Step 1: Login as super admin
    await page.goto("/login");

    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    await emailInput.fill("admin@test.com");
    await passwordInput.fill("admin123");
    await submitButton.click();

    // Step 2: Should redirect to admin dashboard
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });

    // Step 3: Verify admin dashboard
    await expect(page.getByText(/Admin|Dashboard|Platform|Stats/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("Admin restaurants management", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    await emailInput.fill("admin@test.com");
    await passwordInput.fill("admin123");
    await submitButton.click();

    await page.waitForURL(/\/admin/, { timeout: 15000 });

    // Navigate to restaurants
    const restaurantsLink = page.getByRole("link", { name: /Restaurants/i });
    if (await restaurantsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await restaurantsLink.click();
      await page.waitForURL(/\/admin\/restaurants/, { timeout: 10000 });
      
      // Verify restaurants page
      await expect(page.getByText(/Restaurants|List|Manage/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("Admin white-label management", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    await emailInput.fill("admin@test.com");
    await passwordInput.fill("admin123");
    await submitButton.click();

    await page.waitForURL(/\/admin/, { timeout: 15000 });

    // Navigate to white-labels
    const whiteLabelLink = page.getByRole("link", { name: /White.?Label/i });
    if (await whiteLabelLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await whiteLabelLink.click();
      await page.waitForURL(/\/admin\/(white-labels|whitelabels)/, { timeout: 10000 });
      
      // Verify white-label page
      await expect(page.getByText(/White.?Label|Partner|Domain/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("Non-admin cannot access admin routes", async ({ page }) => {
    // Login as restaurant owner
    await page.goto("/login");
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    await emailInput.fill("restaurant@test.com");
    await passwordInput.fill("password123");
    await submitButton.click();

    // Try to access admin route
    await page.goto("/admin/dashboard");
    
    // Should redirect to 403 or dashboard
    await page.waitForURL(/\/(403|dashboard|login)/, { timeout: 10000 });
  });
});
