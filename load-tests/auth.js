/**
 * k6 Load Test: Auth Endpoints (Login)
 *
 * Simulates login attempts via POST /api/auth/login.
 * Measures rate-limit readiness (rate limiting not yet implemented - just measure).
 *
 * Expected Output Metrics:
 * - avg latency: < 400ms (acceptable: 200-500ms for bcrypt + session)
 * - p(95): < 500ms (threshold)
 * - error %: < 1% (threshold)
 * - request rate: varies with VUs
 *
 * Note: Invalid credentials return 401 - acceptable for load test.
 * Use TEST_EMAIL/TEST_PASSWORD env for valid creds if available.
 */

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TEST_EMAIL = __ENV.TEST_EMAIL || "loadtest@example.com";
const TEST_PASSWORD = __ENV.TEST_PASSWORD || "loadtest-password";

export default function () {
  const headers = {
    "Content-Type": "application/json",
  };

  const payload = JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, { headers });

  // 200 = success, 401 = invalid creds (expected if no test user), 400 = validation error
  check(res, {
    "auth response received": (r) => r.status === 200 || r.status === 401 || r.status === 400,
    "auth response time acceptable": (r) => r.timings.duration < 2000,
  });

  sleep(0.5); // Space requests to measure rate-limit readiness
}
