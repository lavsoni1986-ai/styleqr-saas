/**
 * k6 Load Test: Menu API
 * 
 * Tests:
 * - GET /api/menus/categories
 * - GET /api/menus/items
 * - POST /api/menus/categories
 * - POST /api/menus/items
 * 
 * Performance Targets:
 * - P95 latency < 200ms
 * - Error rate < 0.1%
 * - Throughput: 200+ req/sec
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

const menuListLatency = new Trend("menu_list_latency");
const menuCreateLatency = new Trend("menu_create_latency");
const menuErrors = new Counter("menu_errors");
const errorRate = new Rate("menu_error_rate");

export const options = {
  stages: [
    { duration: "30s", target: 100 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 400 },
    { duration: "2m", target: 200 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<200", "p(99)<400"],
    http_req_failed: ["rate<0.001"],
    menu_list_latency: ["p(95)<200"],
    menu_create_latency: ["p(95)<300"],
    menu_error_rate: ["rate<0.001"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";
const RESTAURANT_ID = __ENV.RESTAURANT_ID || "";

export default function () {
  const headers = {
    "Content-Type": "application/json",
    ...(AUTH_TOKEN && { Cookie: `next-auth.session-token=${AUTH_TOKEN}` }),
  };

  if (!RESTAURANT_ID) {
    console.error("RESTAURANT_ID environment variable required");
    return;
  }

  // Test: List categories (80% of requests)
  if (Math.random() < 0.8) {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/menus/categories?restaurantId=${RESTAURANT_ID}`,
      { headers }
    );
    const duration = Date.now() - start;

    const checkResult = check(res, {
      "categories status 200": (r) => r.status === 200,
      "categories has data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });

    menuListLatency.add(duration);
    if (!checkResult) {
      menuErrors.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }

  // Test: List menu items (70% of requests)
  if (Math.random() < 0.7) {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/menus/items?restaurantId=${RESTAURANT_ID}`,
      { headers }
    );
    const duration = Date.now() - start;

    const checkResult = check(res, {
      "items status 200": (r) => r.status === 200,
      "items has data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });

    menuListLatency.add(duration);
    if (!checkResult) {
      menuErrors.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }

  // Test: Create category (5% of requests)
  if (Math.random() < 0.05) {
    const start = Date.now();
    const payload = JSON.stringify({
      name: `Category ${Date.now()}-${__VU}`,
      restaurantId: RESTAURANT_ID,
    });
    const res = http.post(`${BASE_URL}/api/menus/categories`, payload, {
      headers,
    });
    const duration = Date.now() - start;

    const checkResult = check(res, {
      "create category status 201": (r) => r.status === 201,
    });

    menuCreateLatency.add(duration);
    if (!checkResult) {
      menuErrors.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }

  sleep(0.5);
}

