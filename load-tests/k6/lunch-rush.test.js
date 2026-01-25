/**
 * k6 Load Test: Lunch Rush Simulation
 * 
 * Simulates:
 * - 10x normal traffic during lunch hours
 * - Mixed workload (QR scans, orders, menu views)
 * - Sustained high load
 * 
 * Performance Targets:
 * - P95 latency < 300ms
 * - Error rate < 0.1%
 * - Throughput: 500+ req/sec
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

const mixedLatency = new Trend("mixed_latency");
const mixedErrors = new Counter("mixed_errors");
const errorRate = new Rate("mixed_error_rate");

export const options = {
  stages: [
    { duration: "1m", target: 200 },   // Ramp up
    { duration: "5m", target: 500 },  // Lunch rush
    { duration: "10m", target: 1000 }, // Peak rush
    { duration: "5m", target: 500 },   // Sustained
    { duration: "1m", target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<300", "p(99)<600"],
    http_req_failed: ["rate<0.001"],
    mixed_latency: ["p(95)<300"],
    mixed_error_rate: ["rate<0.001"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";
const RESTAURANT_ID = __ENV.RESTAURANT_ID || "";
const QR_TOKEN = __ENV.QR_TOKEN || "";

export default function () {
  const headers = {
    "Content-Type": "application/json",
    ...(AUTH_TOKEN && { Cookie: `next-auth.session-token=${AUTH_TOKEN}` }),
  };

  const workload = Math.random();

  // 40% QR scans
  if (workload < 0.4 && QR_TOKEN) {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/qr?token=${QR_TOKEN}`);
    const duration = Date.now() - start;

    const checkResult = check(res, {
      "qr scan status 200": (r) => r.status === 200,
    });

    mixedLatency.add(duration);
    if (!checkResult) {
      mixedErrors.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }
  // 30% Menu views
  else if (workload < 0.7 && RESTAURANT_ID) {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/menus/items?restaurantId=${RESTAURANT_ID}`,
      { headers }
    );
    const duration = Date.now() - start;

    const checkResult = check(res, {
      "menu view status 200": (r) => r.status === 200,
    });

    mixedLatency.add(duration);
    if (!checkResult) {
      mixedErrors.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }
  // 20% Order creation
  else if (workload < 0.9 && RESTAURANT_ID) {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/orders/v2?restaurantId=${RESTAURANT_ID}`,
      { headers }
    );
    const duration = Date.now() - start;

    const checkResult = check(res, {
      "order list status 200": (r) => r.status === 200,
    });

    mixedLatency.add(duration);
    if (!checkResult) {
      mixedErrors.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }
  // 10% Dashboard API
  else if (RESTAURANT_ID) {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/admin/orders?restaurantId=${RESTAURANT_ID}`,
      { headers }
    );
    const duration = Date.now() - start;

    const checkResult = check(res, {
      "dashboard status 200 or 401": (r) => r.status === 200 || r.status === 401,
    });

    mixedLatency.add(duration);
    if (!checkResult) {
      mixedErrors.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }

  sleep(0.5);
}

