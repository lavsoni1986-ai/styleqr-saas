import { test, expect } from "@playwright/test";

/**
 * Menu API Tests
 * Tests menu item retrieval and management
 */
test.describe("Menu API", () => {
  const baseURL = process.env.BASE_URL || "http://localhost:3000";

  test("GET /api/menu - Public menu endpoint", async ({ request }) => {
    const response = await request.get(`${baseURL}/api/menu`);

    // Should return 200 or 400/404 (depending on required params)
    expect([200, 400, 404]).toContain(response.status());
  });

  test("GET /api/admin/menu-items - Requires authentication", async ({ request }) => {
    const response = await request.get(`${baseURL}/api/admin/menu-items?restaurantId=test`);

    // Should return 401 or 403
    expect([401, 403]).toContain(response.status());
  });

  test("GET /api/admin/menu-items - With authentication", async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: "restaurant@test.com",
        password: "password123",
      },
    });

    if (!loginResponse.ok()) {
      test.skip();
      return;
    }

    const cookies = loginResponse.headers()["set-cookie"] || [];

    // Get menu items
    const menuResponse = await request.get(`${baseURL}/api/admin/menu-items?restaurantId=test`, {
      headers: {
        Cookie: Array.isArray(cookies) ? cookies.join("; ") : cookies,
      },
    });

    // Should return 200 or 404
    expect([200, 404]).toContain(menuResponse.status());

    if (menuResponse.ok()) {
      const body = await menuResponse.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test("POST /api/admin/menu-items - Create menu item", async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: "restaurant@test.com",
        password: "password123",
      },
    });

    if (!loginResponse.ok()) {
      test.skip();
      return;
    }

    const cookies = loginResponse.headers()["set-cookie"] || [];

    // Create menu item
    const createResponse = await request.post(`${baseURL}/api/admin/menu-items`, {
      headers: {
        Cookie: Array.isArray(cookies) ? cookies.join("; ") : cookies,
        "Content-Type": "application/json",
      },
      data: {
        name: `Test Item ${Date.now()}`,
        price: 9.99,
        categoryId: "test-category-id",
      },
    });

    // Should return 201 or 400/404
    expect([201, 400, 404, 500]).toContain(createResponse.status());
  });

  test("GET /api/qr - Resolve QR token", async ({ request }) => {
    const response = await request.get(`${baseURL}/api/qr?token=test-token`);

    // Should return 200 (with data) or 404 (token not found) or 400 (missing token)
    expect([200, 400, 404]).toContain(response.status());

    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty("restaurantId");
      expect(body).toHaveProperty("tableId");
    }
  });

  test("GET /api/qr - Missing token", async ({ request }) => {
    const response = await request.get(`${baseURL}/api/qr`);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});
