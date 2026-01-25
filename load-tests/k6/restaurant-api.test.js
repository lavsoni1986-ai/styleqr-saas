/**
 * k6 Load Test: Restaurant API
 * 
 * Tests:
 * - GET /api/restaurants (list restaurants)
 * - POST /api/restaurants (create restaurant)
 * 
 * Performance Targets:
 * - P95 latency < 200ms
 * - Error rate < 0.1%
 * - Throughput: 100+ req/sec
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
const restaurantListLatency = new Trend("restaurant_list_latency");
const restaurantCreateLatency = new Trend("restaurant_create_latency");
const restaurantErrors = new Counter("restaurant_errors");
const errorRate = new Rate("restaurant_error_rate");

export const options = {
  stages: [
    { duration: "30s", target: 50 },   // Ramp up
    { duration: "2m", target: 100 },    // Sustained load
    { duration: "1m", target: 200 },    // Peak load
    { duration: "2m", target: 100 },   // Sustained
    { duration: "30s", target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<250", "p(99)<500"],
    http_req_failed: ["rate<0.001"],
    restaurant_list_latency: ["p(95)<200"],
    restaurant_create_latency: ["p(95)<300"],
    restaurant_error_rate: ["rate<0.001"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

export default function () {
  const headers = {
    "Content-Type": "application/json",
    ...(AUTH_TOKEN && { Cookie: `next-auth.session-token=${AUTH_TOKEN}` }),
  };

  // Test: List restaurants
  const listStart = Date.now();
  const listRes = http.get(`${BASE_URL}/api/restaurants`, { headers });
  const listDuration = Date.now() - listStart;

  const listCheck = check(listRes, {
    "list status 200": (r) => r.status === 200,
    "list has data": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });

  restaurantListLatency.add(listDuration);
  if (!listCheck) {
    restaurantErrors.add(1);
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  sleep(1);

  // Test: Create restaurant (10% of requests)
  if (Math.random() < 0.1) {
    const createStart = Date.now();
    const createPayload = JSON.stringify({
      name: `Test Restaurant ${Date.now()}-${__VU}`,
      description: "Load test restaurant",
    });
    const createRes = http.post(
      `${BASE_URL}/api/restaurants`,
      createPayload,
      { headers }
    );
    const createDuration = Date.now() - createStart;

    const createCheck = check(createRes, {
      "create status 201": (r) => r.status === 201,
      "create has data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && body.data?.id;
        } catch {
          return false;
        }
      },
    });

    restaurantCreateLatency.add(createDuration);
    if (!createCheck) {
      restaurantErrors.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }

  sleep(1);
}

