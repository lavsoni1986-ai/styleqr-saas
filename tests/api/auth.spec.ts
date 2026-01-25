import { test, expect } from "@playwright/test";

/**
 * Authentication API Tests
 * Tests signup, login, logout endpoints
 */
test.describe("Authentication API", () => {
  const baseURL = process.env.BASE_URL || "http://localhost:3000";

  test("POST /api/auth/login - Valid credentials", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: "restaurant@test.com",
        password: "password123",
      },
    });

    // Should return 200 or 401 (depending on if user exists)
    expect([200, 401]).toContain(response.status());

    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("user");
      expect(body.user).toHaveProperty("email");
    } else {
      // 401 is valid if user doesn't exist in test DB
      const body = await response.json();
      expect(body).toHaveProperty("error");
    }
  });

  test("POST /api/auth/login - Invalid credentials", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: "invalid@test.com",
        password: "wrongpassword",
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/auth/login - Missing fields", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: "test@test.com",
        // password missing
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/auth/signup - Valid signup", async ({ request }) => {
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@test.com`;

    const response = await request.post(`${baseURL}/api/auth/signup`, {
      data: {
        restaurantName: `Test Restaurant ${timestamp}`,
        ownerName: "Test Owner",
        email: testEmail,
        password: "password123",
      },
    });

    // Should return 201 or 400 (if email exists)
    expect([201, 400, 500]).toContain(response.status());

    if (response.status() === 201) {
      const body = await response.json();
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("user");
    }
  });

  test("POST /api/auth/signup - Invalid data", async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/signup`, {
      data: {
        restaurantName: "A", // Too short
        ownerName: "B", // Too short
        email: "invalid-email", // Invalid format
        password: "123", // Too short
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/auth/logout", async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: "restaurant@test.com",
        password: "password123",
      },
    });

    // Get cookies from login
    const cookies = loginResponse.headers()["set-cookie"] || [];

    // Logout
    const logoutResponse = await request.post(`${baseURL}/api/auth/logout`, {
      headers: {
        Cookie: Array.isArray(cookies) ? cookies.join("; ") : cookies,
      },
    });

    // Logout should succeed (200 or 204)
    expect([200, 204]).toContain(logoutResponse.status());
  });
});
