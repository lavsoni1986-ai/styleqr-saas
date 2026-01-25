/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture "use" is not React's use() hook */
import { test as base } from '@playwright/test';
import { APIClient } from './helpers/api-client';
import { DashboardPage, BillingPage, KitchenPage, PaymentPage } from './helpers/page-objects';

type TestFixtures = {
  apiClient: APIClient;
  dashboardPage: DashboardPage;
  billingPage: BillingPage;
  kitchenPage: KitchenPage;
  paymentPage: PaymentPage;
};

export const test = base.extend<TestFixtures>({
  apiClient: async ({ request }, use) => {
    const client = new APIClient(request);
    await use(client);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboard = new DashboardPage(page);
    await use(dashboard);
  },

  billingPage: async ({ page }, use) => {
    const billing = new BillingPage(page);
    await use(billing);
  },

  kitchenPage: async ({ page }, use) => {
    const kitchen = new KitchenPage(page);
    await use(kitchen);
  },

  paymentPage: async ({ page }, use) => {
    const payment = new PaymentPage(page);
    await use(payment);
  },
});

export { expect } from '@playwright/test';
