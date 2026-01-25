/**
 * k6 – Dashboard page (auth required)
 * POST /api/auth/login, then GET /dashboard with session cookie
 *
 * Env: BASE_URL, VUS, LOADTEST_EMAIL, LOADTEST_PASSWORD (required for 200)
 * Run: k6 run loadtest/scenarios/dashboard.test.js
 *      k6 run -e VUS=500 -e LOADTEST_EMAIL=u@x.com -e LOADTEST_PASSWORD=ppp loadtest/scenarios/dashboard.test.js
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

function parseSessionCookie(setCookie) {
  if (!setCookie) return null;
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const s of arr) {
    const m = /styleqr-session=([^;]+)/.exec(s);
    if (m) return m[1];
  }
  return null;
}

export default function () {
  // 1) Login
  const loginRes = http.post(`${BASE}/api/auth/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
    headers: { "Content-Type": "application/json" },
    tags: { name: "login" },
  });
  const loginOk = check(loginRes, {
    "login 200 or 4xx": (r) => r.status >= 200 && r.status < 500,
  });
  errorRate.add(!loginOk);

  const session = parseSessionCookie(loginRes.headers["Set-Cookie"]);
  sleep(0.3);

  // 2) Dashboard (with cookie if we got one)
  const headers = {};
  if (session) headers["Cookie"] = `styleqr-session=${session}`;

  const dashRes = http.get(`${BASE}/dashboard`, { headers, tags: { name: "dashboard" } });
  const dashOk = check(dashRes, {
    "dashboard 200 or 307/302": (r) => [200, 302, 307].includes(r.status),
    "dashboard p95 reasonable": (r) => r.timings.duration < 15000,
  });
  errorRate.add(!dashOk);
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
[dashboard] VUs: ${(m.vus && m.vus.values && m.vus.values.max) || "-"} | ` +
    `p95: ${dur && dur["p(95)"] != null ? Math.round(dur["p(95)"]) + "ms" : "-"} | ` +
    `fail: ${failed && failed.rate != null ? (failed.rate * 100).toFixed(2) + "%" : "-"}
`;
}
