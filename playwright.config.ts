import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,  // Run sequentially to avoid server overload
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,  // Single worker to avoid race conditions
  timeout: 60_000,  // 60 second timeout
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      PLAYWRIGHT: 'true',
      TEST_MODE: 'true',
    },
  },
});
