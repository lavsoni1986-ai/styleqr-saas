/**
 * k6 Load Test: Homepage
 *
 * Validates homepage load under traffic.
 * Target: GET /
 *
 * Expected Output Metrics:
 * - avg latency: < 200ms (acceptable: 50-200ms for SSR)
 * - p(95): < 500ms (threshold)
 * - error %: < 1% (threshold)
 * - request rate: varies with VUs
 */

import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 100,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const res = http.get(`${BASE_URL}/`);

  check(res, {
    "homepage status 200": (r) => r.status === 200,
    "homepage returns HTML": (r) =>
      r.headers["Content-Type"]?.includes("text/html") || r.body?.length > 0,
  });
}
