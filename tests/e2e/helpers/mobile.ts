import { Page } from '@playwright/test';

/**
 * Opens mobile menu if visible (for collapsed sidebar on mobile)
 */
export async function openMobileMenu(page: Page) {
  // Try the data-testid first, then fallback to role/name
  const menuBtnByTestId = page.getByTestId('mobile-menu-toggle');
  
  try {
    // Check if mobile menu toggle exists via data-testid
    if (await menuBtnByTestId.isVisible({ timeout: 500 })) {
      await menuBtnByTestId.click();
    }
  } catch (error) {
    // Menu button not found, continue (desktop layout)
  }
}

/**
 * Closes mobile menu if open - CRITICAL for avoiding overlay blocking clicks
 */
export async function closeMobileMenu(page: Page) {
  try {
    // Check if there's a mobile overlay blocking clicks
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50.z-40.md\\:hidden');
    
    if (await overlay.isVisible({ timeout: 300 })) {
      // Click the overlay to close the menu
      await overlay.click({ position: { x: 10, y: 10 } });
      return;
    }

    // Alternative: check if mobile menu is visible and toggle is available
    const mobileMenu = page.getByTestId('mobile-menu');
    const menuBtnByTestId = page.getByTestId('mobile-menu-toggle');
    
    if (await mobileMenu.isVisible({ timeout: 300 })) {
      if (await menuBtnByTestId.isVisible({ timeout: 200 })) {
        await menuBtnByTestId.click();
        return;
      }
    }
  } catch (error) {
    // Menu already closed or not in mobile view
  }
}

/**
 * Ensures no mobile overlay is blocking interactions
 */
export async function ensureNoOverlay(page: Page) {
  try {
    // Wait for any overlay to disappear
    const overlay = page.locator('.fixed.inset-0.bg-black');
    await overlay.waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
  } catch (error) {
    // No overlay or already hidden
  }
}
