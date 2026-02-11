/**
 * k6 Load Test: Internal Health Endpoint
 *
 * Validates health endpoint stability under load.
 * Target: GET /api/internal/health
 * Requires: INTERNAL_API_SECRET header (x-internal-secret or Authorization: Bearer)
 *
 * Expected Output Metrics:
 * - avg latency: < 150ms (acceptable: 50-150ms for DB+Stripe checks)
 * - p(95): < 500ms (threshold)
 * - error %: < 1% (threshold)
 * - request rate: varies with VUs
 */

import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 50,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const INTERNAL_SECRET = __ENV.INTERNAL_API_SECRET || "local-internal-secret";

export default function () {
  const headers = {
    "x-internal-secret": INTERNAL_SECRET,
  };

  const res = http.get(`${BASE_URL}/api/internal/health`, { headers });

  check(res, {
    "health status 200": (r) => r.status === 200,
    "health has status field": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && typeof body.status === "string";
      } catch {
        return false;
      }
    },
  });
}
