/**
 * k6 Load Test: Auth API
 * 
 * Tests:
 * - POST /api/auth/signin (login)
 * - POST /api/auth/signout (logout)
 * 
 * Performance Targets:
 * - P95 latency < 500ms (auth is slower due to bcrypt)
 * - Error rate < 0.1%
 * - Throughput: 50+ req/sec
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

const loginLatency = new Trend("login_latency");
const logoutLatency = new Trend("logout_latency");
const authErrors = new Counter("auth_errors");
const errorRate = new Rate("auth_error_rate");

export const options = {
  stages: [
    { duration: "30s", target: 25 },
    { duration: "2m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "2m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.001"],
    login_latency: ["p(95)<500"],
    logout_latency: ["p(95)<200"],
    auth_error_rate: ["rate<0.001"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TEST_EMAIL = __ENV.TEST_EMAIL || "test@example.com";
const TEST_PASSWORD = __ENV.TEST_PASSWORD || "password123";

export default function () {
  const headers = {
    "Content-Type": "application/json",
  };

  // Test: Login (80% of requests)
  if (Math.random() < 0.8) {
    const payload = JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/auth/signin`, payload, { headers });
    const duration = Date.now() - start;

    const checkResult = check(res, {
      "login status 200": (r) => r.status === 200,
      "login has token": (r) => {
        const cookies = r.cookies;
        return (
          cookies["next-auth.session-token"] ||
          cookies["styleqr-session"] ||
          false
        );
      },
    });

    loginLatency.add(duration);
    if (!checkResult) {
      authErrors.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }

    // Extract session token for logout test
    const sessionToken =
      res.cookies["next-auth.session-token"]?.[0]?.value ||
      res.cookies["styleqr-session"]?.[0]?.value;

    // Test: Logout (30% of logins)
    if (sessionToken && Math.random() < 0.3) {
      const logoutHeaders = {
        ...headers,
        Cookie: `next-auth.session-token=${sessionToken}`,
      };

      const logoutStart = Date.now();
      const logoutRes = http.post(
        `${BASE_URL}/api/auth/signout`,
        {},
        { headers: logoutHeaders }
      );
      const logoutDuration = Date.now() - logoutStart;

      const logoutCheck = check(logoutRes, {
        "logout status 200": (r) => r.status === 200,
      });

      logoutLatency.add(logoutDuration);
      if (!logoutCheck) {
        authErrors.add(1);
        errorRate.add(1);
      } else {
        errorRate.add(0);
      }
    }
  }

  sleep(2); // Auth endpoints need more spacing
}

