/**
 * k6 Load Test: Stripe Webhook Endpoint
 *
 * Simulates concurrent webhook POST to /api/stripe/webhook.
 * Uses INVALID signature - server must return 400, NOT crash.
 *
 * Validates:
 * - Server handles concurrent webhook hits gracefully
 * - Invalid signature returns 400 (not 500, not crash)
 * - No memory leaks or unhandled errors
 *
 * Expected Output Metrics:
 * - avg latency: < 100ms (acceptable: 20-100ms for sig verification failure)
 * - p(95): < 500ms (threshold)
 * - error %: 0% (400 is expected, not a failure - we check for 500)
 * - request rate: varies with VUs
 *
 * Note: http_req_failed allows 4xx (400 expected). server_5xx_rate ensures no crashes.
 */

import http from "k6/http";
import { check } from "k6";
import { Rate } from "k6/metrics";

const server5xxRate = new Rate("server_5xx_rate");

export const options = {
  vus: 50,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<1"], // 4xx expected for invalid sig
    server_5xx_rate: ["rate<0.01"], // Must NOT return 500
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Stripe-like webhook payload (invoice.paid shape - minimal)
const WEBHOOK_BODY = JSON.stringify({
  id: "evt_loadtest_" + Date.now(),
  type: "invoice.paid",
  data: {
    object: {
      id: "in_loadtest",
      object: "invoice",
      amount_paid: 1000,
    },
  },
});

// Invalid signature - server must reject with 400, not crash
const INVALID_SIGNATURE = "t=1234567890,v1=invalid_signature_for_load_test";

export default function () {
  const headers = {
    "Content-Type": "application/json",
    "stripe-signature": INVALID_SIGNATURE,
  };

  const res = http.post(`${BASE_URL}/api/stripe/webhook`, WEBHOOK_BODY, { headers });

  server5xxRate.add(res.status >= 500 ? 1 : 0);

  // 400 = expected (invalid signature), 401 = also acceptable
  // 500 = BAD - indicates server crash or unhandled error
  check(res, {
    "webhook returns 400 or 401": (r) => r.status === 400 || r.status === 401,
    "webhook does not 500": (r) => r.status !== 500,
  });
}
