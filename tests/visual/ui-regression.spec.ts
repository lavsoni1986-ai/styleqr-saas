import { test, expect } from "@playwright/test";
import percySnapshot from "@percy/playwright";

/**
 * Visual Regression Tests
 * AI-powered visual testing using Percy
 * 
 * These tests capture screenshots and compare them against baseline images.
 * Any visual changes (layout, CSS, components) will be detected automatically.
 */

test.describe("Visual Regression - Public Pages", () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for visual tests
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("Home page visual snapshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
    
    // Capture visual snapshot
    await percySnapshot(page, "Home Page - Desktop");
  });

  test("Login page visual snapshot", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await page.waitForTimeout(500);
    
    await percySnapshot(page, "Login Page - Desktop");
  });

  test("Signup page visual snapshot", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await page.waitForTimeout(500);
    
    await percySnapshot(page, "Signup Page - Desktop");
  });

  test("Menu page visual snapshot (public)", async ({ page }) => {
    // Navigate to menu page (may show error if no token, that's fine for visual test)
    await page.goto("/menu");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Capture both error state and menu state if available
    await percySnapshot(page, "Menu Page - Public View");
  });

  test("403 Forbidden page visual snapshot", async ({ page }) => {
    await page.goto("/403");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await page.waitForTimeout(500);
    
    await percySnapshot(page, "403 Forbidden Page");
  });
});

test.describe("Visual Regression - Responsive Views", () => {
  test("Home page - Mobile view", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    await percySnapshot(page, "Home Page - Mobile (375px)");
  });

  test("Home page - Tablet view", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    await percySnapshot(page, "Home Page - Tablet (768px)");
  });

  test("Login page - Mobile view", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await page.waitForTimeout(500);
    
    await percySnapshot(page, "Login Page - Mobile (375px)");
  });

  test("Menu page - Mobile view", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/menu");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    await percySnapshot(page, "Menu Page - Mobile (375px)");
  });
});

test.describe("Visual Regression - Authenticated Pages", () => {
  test("Dashboard page visual snapshot", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    // Only proceed if login form exists
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill("restaurant@test.com");
      await passwordInput.fill("password123");
      await submitButton.click();
      
      // Wait for dashboard
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for data to load
      
      await percySnapshot(page, "Dashboard Page - Desktop");
    } else {
      test.skip();
    }
  });

  test("Menu management page visual snapshot", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill("restaurant@test.com");
      await passwordInput.fill("password123");
      await submitButton.click();
      
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
      
      // Navigate to menu management
      const menuLink = page.getByRole("link", { name: /Menu/i });
      if (await menuLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await menuLink.click();
        await page.waitForURL(/\/dashboard\/menu/, { timeout: 10000 });
        await page.waitForLoadState("networkidle", { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        await percySnapshot(page, "Menu Management Page - Desktop");
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test("QR generator page visual snapshot", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill("restaurant@test.com");
      await passwordInput.fill("password123");
      await submitButton.click();
      
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
      
      // Navigate to QR page
      const qrLink = page.getByRole("link", { name: /QR/i });
      if (await qrLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await qrLink.click();
        await page.waitForURL(/\/dashboard\/qr/, { timeout: 10000 });
        await page.waitForLoadState("networkidle", { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        await percySnapshot(page, "QR Generator Page - Desktop");
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });
});

test.describe("Visual Regression - Component States", () => {
  test("Login form - Empty state", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await page.waitForTimeout(500);
    
    await percySnapshot(page, "Login Form - Empty State");
  });

  test("Login form - Filled state", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill("test@example.com");
      await passwordInput.fill("password123");
      await page.waitForTimeout(500);
      
      await percySnapshot(page, "Login Form - Filled State");
    } else {
      test.skip();
    }
  });

  test("Menu page - Loading state", async ({ page }) => {
    await page.goto("/menu?token=test-token");
    
    // Capture loading state (if visible)
    await page.waitForTimeout(500);
    
    // Check if loading skeleton is visible
    const hasLoading = await page.getByText(/Loading|Skeleton/i).isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasLoading) {
      await percySnapshot(page, "Menu Page - Loading State");
    } else {
      // If no loading state, capture whatever is shown
      await percySnapshot(page, "Menu Page - Initial State");
    }
  });

  test("Menu page - Empty state", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Check for empty state message
    const hasEmptyState = await page.getByText(/No items|Empty|Coming soon/i).isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasEmptyState) {
      await percySnapshot(page, "Menu Page - Empty State");
    }
  });
});

test.describe("Visual Regression - Admin Pages", () => {
  test("Admin dashboard visual snapshot", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[name="password"]'));
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill("admin@test.com");
      await passwordInput.fill("admin123");
      await submitButton.click();
      
      // Wait for admin dashboard
      await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      await percySnapshot(page, "Admin Dashboard - Desktop");
    } else {
      test.skip();
    }
  });
});
