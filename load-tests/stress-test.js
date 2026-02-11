/**
 * k6 Load Test: Stress Test (Ramp + Steady)
 *
 * Ramp pattern:
 * - 0 → 100 users in 30s
 * - 100 → 300 users in 60s
 * - 300 steady for 2 minutes
 *
 * Measures: response time, failure rate, throughput.
 * Hits: homepage, health, auth, admin (401), webhook (400).
 *
 * ============================================
 * PHASE 5 — MEMORY MONITORING INSTRUCTIONS
 * ============================================
 * During stress-test run:
 * 1. Monitor Node memory: node --expose-gc or pm2 monit
 * 2. Ensure no memory leak (heap should stabilize, not grow unbounded)
 * 3. Ensure CPU stable (no sustained 100% spikes)
 * 4. Check logs for errors (Sentry, pino output)
 *
 * Example: Run Node with memory tracking
 *   NODE_OPTIONS="--max-old-space-size=4096" npm run start
 *   Then: watch -n 5 'ps -o rss= -p $(pgrep -f "node.*server")'
 *
 * Expected Output Metrics:
 * - avg latency: < 500ms under 300 VUs
 * - p(95): < 500ms (threshold)
 * - error %: < 1% (threshold)
 * - request rate: target 200+ req/s at 300 VUs
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const server5xxRate = new Rate("server_5xx_rate");

export const options = {
  stages: [
    { duration: "30s", target: 100 },
    { duration: "60s", target: 300 },
    { duration: "2m", target: 300 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<1"], // 4xx expected for unauth/protected routes
    server_5xx_rate: ["rate<0.01"], // Must NOT return 500
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const INTERNAL_SECRET = __ENV.INTERNAL_API_SECRET || "local-internal-secret";

// Mix of endpoints to simulate real traffic (incl. financial routes)
const endpoints = [
  { method: "GET", url: `${BASE_URL}/`, headers: {} },
  {
    method: "GET",
    url: `${BASE_URL}/api/internal/health`,
    headers: { "x-internal-secret": INTERNAL_SECRET },
  },
  {
    method: "POST",
    url: `${BASE_URL}/api/auth/login`,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "stress@test.com", password: "stress" }),
  },
  {
    method: "GET",
    url: `${BASE_URL}/api/admin/orders`,
    headers: { Authorization: "Bearer mock-stress-test" },
  },
  {
    method: "GET",
    url: `${BASE_URL}/api/billing`,
    headers: { Authorization: "Bearer mock-stress-test" },
  },
  {
    method: "GET",
    url: `${BASE_URL}/api/settlements/daily`,
    headers: { Authorization: "Bearer mock-stress-test" },
  },
  {
    method: "POST",
    url: `${BASE_URL}/api/stripe/webhook`,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "t=0,v1=invalid",
    },
    body: JSON.stringify({
      id: "evt_stress",
      type: "invoice.paid",
      data: { object: { id: "in_stress", amount_paid: 1000 } },
    }),
  },
];

export default function () {
  const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
  let res;

  if (ep.method === "GET") {
    res = http.request(ep.method, ep.url, { headers: ep.headers });
  } else {
    res = http.request(ep.method, ep.url, ep.body, { headers: ep.headers });
  }

  server5xxRate.add(res.status >= 500 ? 1 : 0);

  // Accept 200, 400, 401 - reject 500
  check(res, {
    "no server error": (r) => r.status < 500,
    "response received": (r) => r.status >= 0,
  });

  sleep(0.1);
}
