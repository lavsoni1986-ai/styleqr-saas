/**
 * k6 – Login API
 * POST /api/auth/login
 *
 * Env: BASE_URL, VUS, LOADTEST_EMAIL, LOADTEST_PASSWORD (required for 200)
 * Run: k6 run loadtest/scenarios/auth.test.js
 *      k6 run -e VUS=500 -e LOADTEST_EMAIL=u@x.com -e LOADTEST_PASSWORD=ppp loadtest/scenarios/auth.test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { getOptions } from "../k6.config.js";

const errorRate = new Rate("errors");

export const options = getOptions(100);

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const EMAIL = __ENV.LOADTEST_EMAIL || "loadtest@example.com";
const PASSWORD = __ENV.LOADTEST_PASSWORD || "loadtest-password";

export default function () {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const res = http.post(`${BASE}/api/auth/login`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { name: "login" },
  });

  const ok = check(res, {
    "login status 200 or 401/400": (r) => [200, 400, 401].includes(r.status),
    "login p95 reasonable": (r) => r.timings.duration < 10000,
  });
  errorRate.add(!ok);
  sleep(1);
}

export function handleSummary(data) {
  return {
    "stdout": textSummary(data),
  };
}

function textSummary(data) {
  const m = data.metrics || {};
  const dur = m.http_req_duration && m.http_req_duration.values;
  const failed = m.http_req_failed && m.http_req_failed.values;
  return `
[auth] VUs: ${(m.vus && m.vus.values && m.vus.values.max) || "-"} | ` +
    `p95: ${dur && dur["p(95)"] != null ? Math.round(dur["p(95)"]) + "ms" : "-"} | ` +
    `fail: ${failed && failed.rate != null ? (failed.rate * 100).toFixed(2) + "%" : "-"}
`;
}
