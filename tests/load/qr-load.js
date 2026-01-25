/**
 * k6 Load Test - QR Menu Load Test
 * Simulates 100 concurrent users scanning QR codes and loading menus
 * 
 * Run: k6 run tests/load/qr-load.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");

// Test configuration
export const options = {
  stages: [
    { duration: "30s", target: 50 },   // Ramp up to 50 users
    { duration: "1m", target: 100 },   // Ramp up to 100 users
    { duration: "2m", target: 100 },   // Stay at 100 users
    { duration: "30s", target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests should be below 2s
    http_req_failed: ["rate<0.05"],     // Error rate should be less than 5%
    errors: ["rate<0.1"],               // Custom error rate < 10%
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // Test 1: QR Token Resolution
  const qrResponse = http.get(`${BASE_URL}/api/qr?token=test-token-${__VU}`);
  
  const qrCheck = check(qrResponse, {
    "QR API status is 200 or 404": (r) => r.status === 200 || r.status === 404,
    "QR API response time < 2s": (r) => r.timings.duration < 2000,
  });

  errorRate.add(!qrCheck);
  sleep(1);

  // Test 2: Menu Page Load
  const menuResponse = http.get(`${BASE_URL}/menu?token=test-token-${__VU}`);
  
  const menuCheck = check(menuResponse, {
    "Menu page status is 200": (r) => r.status === 200,
    "Menu page response time < 3s": (r) => r.timings.duration < 3000,
    "Menu page contains content": (r) => r.body.length > 1000,
  });

  errorRate.add(!menuCheck);
  sleep(1);

  // Test 3: Menu API Call
  const menuApiResponse = http.get(`${BASE_URL}/api/admin/menu-items?restaurantId=test-restaurant`);
  
  check(menuApiResponse, {
    "Menu API status is 200 or 401": (r) => r.status === 200 || r.status === 401,
    "Menu API response time < 2s": (r) => r.timings.duration < 2000,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    "stdout": textSummary(data, { indent: " ", enableColors: true }),
    "test-results/load-summary.json": JSON.stringify(data),
  };
}

function textSummary(data, options) {
  // Simple text summary
  return `
Load Test Summary
=================
Duration: ${data.state.testRunDurationMs / 1000}s
VUs: ${data.metrics.vus.values.max}
HTTP Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
Avg Response Time: ${data.metrics.http_req_duration.values.avg}ms
P95 Response Time: ${data.metrics.http_req_duration.values["p(95)"]}ms
  `;
}
