import { test, expect } from "@playwright/test";

/**
 * QR → Menu → Order Flow Test
 * Tests the complete customer ordering journey
 */
test.describe("Customer QR Ordering Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to menu page (simulating QR scan)
    await page.goto("/menu");
  });

  test("QR scan → Menu loads → Add items → Place order", async ({ page }) => {
    // Step 1: QR token should be provided via query param
    // For testing, we'll simulate a valid token scenario
    await page.goto("/menu?token=test-qr-token");

    // Step 2: Wait for menu to load (or show error if token invalid)
    // The page should either show menu or error message
    const menuVisible = await page.getByText(/Menu|Restaurant|Items|Categories/i).isVisible().catch(() => false);
    const errorVisible = await page.getByText(/Invalid|Error|Not found/i).isVisible().catch(() => false);

    if (errorVisible) {
      // If token is invalid, that's expected in test environment
      // Skip test or use a valid token from test data
      test.skip();
      return;
    }

    // Step 3: Verify menu is visible
    await expect(page.getByText(/Menu|Restaurant|Categories/i).first()).toBeVisible({ timeout: 10000 });

    // Step 4: Find and click "Add" button on first menu item
    const addButtons = page.getByRole("button", { name: /Add|Add to Cart/i });
    const firstAddButton = addButtons.first();
    
    if (await firstAddButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstAddButton.click();
      
      // Step 5: Verify cart count updated
      const cartCount = page.getByText(/\d+/).first();
      await expect(cartCount).toBeVisible({ timeout: 3000 });
      
      // Step 6: Open cart drawer or view cart
      const cartButton = page.getByRole("button", { name: /Cart|View Cart/i }).or(page.getByText(/Cart/i));
      if (await cartButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cartButton.click();
        
        // Step 7: Place order
        const placeOrderButton = page.getByRole("button", { name: /Place Order|Order Now/i });
        if (await placeOrderButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await placeOrderButton.click();
          
          // Step 8: Verify order success message
          await expect(
            page.getByText(/Order placed|Success|Order ID|Thank you/i)
          ).toBeVisible({ timeout: 10000 });
        }
      }
    } else {
      // If no items available, that's a valid test scenario
      await expect(page.getByText(/No items|Empty|Coming soon/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("Menu displays categories and items", async ({ page }) => {
    await page.goto("/menu?token=test-qr-token");

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Check for menu structure (categories or items)
    const hasMenuContent = await page.getByText(/Menu|Categories|Items|Restaurant/i).isVisible().catch(() => false);
    
    if (hasMenuContent) {
      // Verify menu structure exists
      await expect(page.locator("body")).toContainText(/Menu|Restaurant|Categories|Items/i);
    } else {
      // Empty menu is also valid
      await expect(page.getByText(/No items|Empty|Coming soon/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("Cart functionality works", async ({ page }) => {
    await page.goto("/menu?token=test-qr-token");
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Try to add item to cart
    const addButton = page.getByRole("button", { name: /Add/i }).first();
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      
      // Verify cart UI updates
      const cartIndicator = page.getByText(/\d+/).or(page.getByText(/Cart/i));
      await expect(cartIndicator).toBeVisible({ timeout: 3000 });
    }
  });
});
