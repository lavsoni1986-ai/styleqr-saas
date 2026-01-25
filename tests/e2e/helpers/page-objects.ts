import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('domcontentloaded');
  }

  get sidebar() {
    return this.page.locator('[data-testid="sidebar"], aside, nav').first();
  }

  get billsList() {
    return this.page.locator('[data-testid="bills-list"], table, .bills-grid').first();
  }

  get ordersList() {
    return this.page.locator('[data-testid="orders-list"], table, .orders-grid').first();
  }

  async openBilling() {
    await this.page.goto('/dashboard/billing');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openPayments() {
    await this.page.goto('/dashboard/payments');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openReports() {
    await this.page.goto('/dashboard/reports');
    await this.page.waitForLoadState('domcontentloaded');
  }
}

export class BillingPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/billing');
    await this.page.waitForLoadState('domcontentloaded');
  }

  get billsList() {
    return this.page.locator('[data-testid="bills-list"], table, .bills-grid').first();
  }

  async openBill(billId?: string) {
    if (billId) {
      await this.page.goto(`/dashboard/billing?id=${billId}`);
    } else {
      const firstBill = this.page.locator('[data-testid="bill-card"], table tbody tr, .bill-card').first();
      if (await firstBill.count() > 0) {
        await firstBill.click();
      }
    }
  }

  get billEditor() {
    return this.page.locator('[data-testid="bill-editor"], .bill-editor, .modal').first();
  }

  get addItemButton() {
    return this.page.locator('[data-testid="add-item"], button:has-text("Add Item"), button:has-text("Add")').first();
  }

  get discountInput() {
    return this.page.locator('[data-testid="discount"], input[name="discount"], input[placeholder*="discount" i]').first();
  }

  get paymentButton() {
    return this.page.locator('[data-testid="add-payment"], button:has-text("Payment"), button:has-text("Add Payment")').first();
  }

  get closeBillButton() {
    return this.page.locator('[data-testid="close-bill"], button:has-text("Close Bill"), button:has-text("Finalize")').first();
  }
}

export class KitchenPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/orders');
    await this.page.waitForLoadState('domcontentloaded');
  }

  get ordersList() {
    return this.page.locator('[data-testid="orders-list"], .orders-grid, table').first();
  }

  async acceptOrder(orderId?: string) {
    const acceptButton = this.page.locator(
      `[data-testid="accept-order-${orderId}"], [data-testid="accept-order"], button:has-text("Accept")`
    ).first();
    
    if (await acceptButton.count() > 0) {
      await acceptButton.click();
    }
  }

  async markPreparing(orderId?: string) {
    const preparingButton = this.page.locator(
      `[data-testid="status-preparing-${orderId}"], [data-testid="status-preparing"], button:has-text("Preparing")`
    ).first();
    
    if (await preparingButton.count() > 0) {
      await preparingButton.click();
    }
  }

  async markServed(orderId?: string) {
    const servedButton = this.page.locator(
      `[data-testid="status-served-${orderId}"], [data-testid="status-served"], button:has-text("Served")`
    ).first();
    
    if (await servedButton.count() > 0) {
      await servedButton.click();
    }
  }
}

export class PaymentPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/payments');
    await this.page.waitForLoadState('domcontentloaded');
  }

  get paymentsList() {
    return this.page.locator('[data-testid="payments-list"], table, .payments-grid').first();
  }

  get paymentModal() {
    return this.page.locator('[data-testid="payment-modal"], .payment-modal, .modal').first();
  }

  async selectCashMethod() {
    const cashButton = this.page.locator('[data-testid="payment-cash"], button:has-text("Cash")').first();
    if (await cashButton.count() > 0) {
      await cashButton.click();
    }
  }

  async enterAmount(amount: string) {
    const amountInput = this.page.locator('[data-testid="payment-amount"], input[name="amount"]').first();
    if (await amountInput.count() > 0) {
      await amountInput.fill(amount);
    }
  }

  async confirmPayment() {
    const confirmButton = this.page.locator('[data-testid="confirm-payment"], button:has-text("Confirm"), button:has-text("Pay")').first();
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
    }
  }
}
