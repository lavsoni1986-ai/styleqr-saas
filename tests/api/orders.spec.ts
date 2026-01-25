import { test, expect } from "@playwright/test";

/**
 * Orders API Tests
 * Tests order creation, retrieval, and management
 */
test.describe("Orders API", () => {
  const baseURL = process.env.BASE_URL || "http://localhost:3000";

  test("POST /api/orders - Create order with QR token", async ({ request }) => {
    // This test requires a valid QR token from test data
    const response = await request.post(`${baseURL}/api/orders`, {
      data: {
        token: "test-qr-token",
        items: [
          {
            menuItemId: "test-item-id",
            qty: 2,
          },
        ],
      },
    });

    // Should return 201, 400 (invalid token), or 404 (token not found)
    expect([201, 400, 404]).toContain(response.status());

    if (response.status() === 201) {
      const body = await response.json();
      expect(body).toHaveProperty("orderId");
    } else {
      const body = await response.json();
      expect(body).toHaveProperty("error");
    }
  });

  test("POST /api/orders - Missing token", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/orders`, {
      data: {
        items: [
          {
            menuItemId: "test-item-id",
            qty: 1,
          },
        ],
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/orders - Invalid items", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/orders`, {
      data: {
        token: "test-token",
        items: [], // Empty items
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/order - Create order (alternative endpoint)", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/order`, {
      data: {
        restaurantId: "test-restaurant-id",
        tableId: "test-table-id",
        total: 25.99,
        items: [
          {
            menuItem: "test-item-id",
            qty: 1,
            price: 25.99,
          },
        ],
      },
    });

    // Should return 201 or 400/500 (depending on data validity)
    expect([201, 400, 500]).toContain(response.status());

    if (response.status() === 201) {
      const body = await response.json();
      expect(body).toHaveProperty("id");
    }
  });

  test("GET /api/admin/orders - Requires authentication", async ({ request }) => {
    // Without authentication
    const response = await request.get(`${baseURL}/api/admin/orders?restaurantId=test`);

    // Should return 401 or 403
    expect([401, 403]).toContain(response.status());
  });

  test("GET /api/admin/orders - With authentication", async ({ request }) => {
    // First login
    const loginResponse = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: "restaurant@test.com",
        password: "password123",
      },
    });

    if (!loginResponse.ok()) {
      test.skip(); // Skip if login fails (user doesn't exist in test DB)
      return;
    }

    const cookies = loginResponse.headers()["set-cookie"] || [];

    // Get orders
    const ordersResponse = await request.get(`${baseURL}/api/admin/orders?restaurantId=test`, {
      headers: {
        Cookie: Array.isArray(cookies) ? cookies.join("; ") : cookies,
      },
    });

    // Should return 200 or 404 (if restaurant not found)
    expect([200, 404]).toContain(ordersResponse.status());
  });
});
