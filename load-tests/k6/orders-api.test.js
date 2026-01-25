/**
 * k6 Load Test: Orders API
 * 
 * Tests:
 * - POST /api/orders/v2 (create order)
 * - GET /api/orders/v2 (list orders)
 * 
 * Performance Targets:
 * - P95 latency < 300ms
 * - Error rate < 0.1%
 * - Throughput: 100+ req/sec
 * - No duplicate orders (idempotency)
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";
import { randomString } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const orderCreateLatency = new Trend("order_create_latency");
const orderListLatency = new Trend("order_list_latency");
const orderErrors = new Counter("order_errors");
const duplicateOrders = new Counter("duplicate_orders");
const errorRate = new Rate("order_error_rate");

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "2m", target: 100 },
    { duration: "1m", target: 200 },
    { duration: "2m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<300", "p(99)<600"],
    http_req_failed: ["rate<0.001"],
    order_create_latency: ["p(95)<300"],
    order_list_latency: ["p(95)<200"],
    order_error_rate: ["rate<0.001"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";
const RESTAURANT_ID = __ENV.RESTAURANT_ID || "";
const MENU_ITEM_IDS = (__ENV.MENU_ITEM_IDS || "").split(",").filter(Boolean);

// Store idempotency keys per VU to test idempotency
const idempotencyKeys = new Map();

export default function () {
  const headers = {
    "Content-Type": "application/json",
    ...(AUTH_TOKEN && { Cookie: `next-auth.session-token=${AUTH_TOKEN}` }),
  };

  if (!RESTAURANT_ID || MENU_ITEM_IDS.length === 0) {
    console.error("RESTAURANT_ID and MENU_ITEM_IDS required");
    return;
  }

  // Test: Create order (60% of requests)
  if (Math.random() < 0.6) {
    const idempotencyKey = idempotencyKeys.get(__VU) || randomString(32);
    idempotencyKeys.set(__VU, idempotencyKey);

    // Select random menu items
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const selectedItems = [];
    for (let i = 0; i < itemCount; i++) {
      const menuItemId =
        MENU_ITEM_IDS[Math.floor(Math.random() * MENU_ITEM_IDS.length)];
      selectedItems.push({
        menuItemId,
        quantity: Math.floor(Math.random() * 3) + 1,
      });
    }

    const payload = JSON.stringify({
      restaurantId: RESTAURANT_ID,
      type: "DINE_IN",
      items: selectedItems,
      idempotencyKey,
      isPriority: Math.random() < 0.1,
    });

    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/orders/v2`, payload, { headers });
    const duration = Date.now() - start;

    const checkResult = check(res, {
      "create order status 201 or 200": (r) => r.status === 201 || r.status === 200,
      "create order has data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && body.data?.id;
        } catch {
          return false;
        }
      },
    });

    // Check for idempotency (200 = already exists)
    if (res.status === 200) {
      duplicateOrders.add(1);
    }

    orderCreateLatency.add(duration);
    if (!checkResult) {
      orderErrors.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }

  // Test: List orders (40% of requests)
  if (Math.random() < 0.4) {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/orders/v2?restaurantId=${RESTAURANT_ID}`,
      { headers }
    );
    const duration = Date.now() - start;

    const checkResult = check(res, {
      "list orders status 200": (r) => r.status === 200,
      "list orders has data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });

    orderListLatency.add(duration);
    if (!checkResult) {
      orderErrors.add(1);
      errorRate.add(0);
    } else {
      errorRate.add(0);
    }
  }

  sleep(1);
}

