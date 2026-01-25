/**
 * k6 Load Test: Health Check Endpoint
 * 
 * Quick smoke test to verify system is responding
 * Use this before running other load tests
 */

import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<100"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    "health check status 200": (r) => r.status === 200,
    "health check has status": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === "healthy" || body.status === "degraded";
      } catch {
        return false;
      }
    },
  });
}

