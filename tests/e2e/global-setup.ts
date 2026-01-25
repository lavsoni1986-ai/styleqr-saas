import { chromium, FullConfig, request } from '@playwright/test';
import { seedFullRestaurantContext } from './helpers/test-data';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const apiContext = await request.newContext();

  try {
    // Seed full restaurant context (this creates/updates the test user with correct password)
    console.log('⚙️ Seeding full restaurant context...');
    await seedFullRestaurantContext();
    console.log('✅ Restaurant context seeded.');

    // Login via API first to get session cookie
    const loginResponse = await apiContext.post('http://localhost:3000/api/auth/login', {
      data: {
        email: 'owner@test.com',
        password: 'password123',
      },
    });

    if (loginResponse.ok()) {
      console.log('✅ API login successful');
      
      // Get cookies from the API response and apply to browser context
      const cookies = loginResponse.headers()['set-cookie'];
      if (cookies) {
        // Parse and set cookies
        const cookieValue = cookies.split(';')[0];
        const [name, value] = cookieValue.split('=');
        await context.addCookies([{
          name: name,
          value: value,
          domain: 'localhost',
          path: '/',
        }]);
      }
      
      // Navigate to dashboard to verify session
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('domcontentloaded');
      
      // Check if we're on dashboard (not redirected to login)
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard') && !currentUrl.includes('/login')) {
        await context.storageState({ path: 'tests/e2e/.auth/owner.json' });
        console.log('✅ Auth state saved successfully');
      } else {
        // Fallback: try UI login
        console.log('⚠️ API login cookies did not persist, trying UI login...');
        await page.goto('http://localhost:3000/login');
        await page.waitForLoadState('domcontentloaded');
        
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
        
        if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
          await emailInput.fill('owner@test.com');
          await passwordInput.fill('password123');
          await submitButton.click();
          
          // Wait for navigation
          await page.waitForURL(url => url.toString().includes('/dashboard'), { timeout: 15000 }).catch(() => {});
          
          const afterLoginUrl = page.url();
          if (afterLoginUrl.includes('/dashboard')) {
            await context.storageState({ path: 'tests/e2e/.auth/owner.json' });
            console.log('✅ Auth state saved via UI login');
          } else {
            console.warn('⚠️ Login failed, auth state not saved. URL:', afterLoginUrl);
          }
        }
      }
    } else {
      console.warn('⚠️ API login failed with status:', loginResponse.status());
      const errorText = await loginResponse.text();
      console.warn('Response:', errorText);
      
      // Try UI login as fallback
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('domcontentloaded');
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
      
      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        await emailInput.fill('owner@test.com');
        await passwordInput.fill('password123');
        await submitButton.click();
        
        await page.waitForURL(url => url.toString().includes('/dashboard'), { timeout: 15000 }).catch(() => {});
        
        const afterLoginUrl = page.url();
        if (afterLoginUrl.includes('/dashboard')) {
          await context.storageState({ path: 'tests/e2e/.auth/owner.json' });
          console.log('✅ Auth state saved via UI login fallback');
        } else {
          console.warn('⚠️ Login failed, auth state not saved');
        }
      }
    }
  } catch (error) {
    console.warn('Global setup auth failed:', error);
  } finally {
    await browser.close();
    await apiContext.dispose();
  }
}

export default globalSetup;
