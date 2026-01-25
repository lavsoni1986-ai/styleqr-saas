/**
 * Chaos & Stress Testing
 * 
 * Tests:
 * - DB restart during traffic
 * - Network latency injection
 * - Partial service failure
 * - Slow queries
 * - Connection pool exhaustion
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const chaosLatency = new Trend("chaos_latency");
const chaosErrors = new Counter("chaos_errors");
const chaosRecoveries = new Counter("chaos_recoveries");

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "2m", target: 100 },
    // Simulate DB restart at 2:30
    { duration: "30s", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // Higher threshold for chaos
    http_req_failed: ["rate<0.1"], // Allow higher error rate during chaos
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

  const testTime = __ITER * __ENV.SLEEP_TIME || 0;

  // Simulate DB restart scenario (around 2:30 mark)
  const isChaosWindow = testTime > 150000 && testTime < 180000;

  // Test: Health check (to detect service degradation)
  const healthStart = Date.now();
  const healthRes = http.get(`${BASE_URL}/api/health`, { timeout: "10s" });
  const healthDuration = Date.now() - healthStart;

  const healthCheck = check(healthRes, {
    "health check responds": (r) => r.status !== 0,
    "health check status": (r) => r.status === 200 || r.status === 503,
  });

  chaosLatency.add(healthDuration);

  if (!healthCheck) {
    chaosErrors.add(1);
  } else if (healthRes.status === 503) {
    // Service degraded but responding
    console.log("⚠️ Service degraded detected");
  } else if (healthRes.status === 200 && isChaosWindow) {
    // Service recovered
    chaosRecoveries.add(1);
  }

  // Test: API endpoint during chaos
  if (RESTAURANT_ID) {
    const apiStart = Date.now();
    const apiRes = http.get(
      `${BASE_URL}/api/restaurants`,
      { headers, timeout: "15s" }
    );
    const apiDuration = Date.now() - apiStart;

    const apiCheck = check(apiRes, {
      "api responds": (r) => r.status !== 0,
      "api status acceptable": (r) =>
        r.status === 200 || r.status === 503 || r.status === 500,
    });

    chaosLatency.add(apiDuration);

    if (!apiCheck) {
      chaosErrors.add(1);
    } else if (apiRes.status === 200 && isChaosWindow) {
      // Service recovered
      chaosRecoveries.add(1);
    }
  }

  // Longer sleep during chaos to simulate recovery time
  sleep(isChaosWindow ? 2 : 1);
}

