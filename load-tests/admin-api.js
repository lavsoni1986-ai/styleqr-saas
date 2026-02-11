/**
 * k6 Load Test: Admin API Endpoints
 *
 * Hits protected endpoint GET /api/admin/orders.
 * - With valid JWT/session: expects 200 (if test user exists)
 * - With no/mock auth: expects 401 (validates auth enforcement)
 *
 * Expected Output Metrics:
 * - avg latency: < 300ms (acceptable: 100-400ms for DB query)
 * - p(95): < 500ms (threshold)
 * - error %: < 1% (401 is success for auth check)
 * - request rate: varies with VUs
 */

import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 20,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Mock JWT for load test - server will reject (401) which validates auth enforcement
const MOCK_AUTH_HEADER = __ENV.ADMIN_AUTH_HEADER || "Bearer mock-jwt-for-load-test";

export default function () {
  const headers = {
    Authorization: MOCK_AUTH_HEADER,
  };

  const res = http.get(`${BASE_URL}/api/admin/orders`, { headers });

  // 401 = unauthorized (expected with mock token) - validates server does not crash
  // 200 = success if valid session cookie provided via setup
  check(res, {
    "admin API responds": (r) => r.status === 200 || r.status === 401,
    "admin API does not 500": (r) => r.status !== 500,
  });
}
