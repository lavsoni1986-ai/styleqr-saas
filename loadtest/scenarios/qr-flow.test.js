/**
 * k6 – QR menu load
 * GET /api/qr?token=, GET /api/menu?restaurantId=
 *
 * Env: BASE_URL, VUS, QR_TOKEN, RESTAURANT_ID (optional; use seeded values)
 * Run: k6 run loadtest/scenarios/qr-flow.test.js
 *      k6 run -e VUS=500 -e BASE_URL=http://192.168.31.135:3000 loadtest/scenarios/qr-flow.test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { getOptions } from "../k6.config.js";

const errorRate = new Rate("errors");

export const options = getOptions(100);

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const QR_TOKEN = __ENV.QR_TOKEN || "test-qr-token";
const RESTAURANT_ID = __ENV.RESTAURANT_ID || "test-restaurant-id";

export default function () {
  // 1) Resolve QR token
  const qrRes = http.get(`${BASE}/api/qr?token=${QR_TOKEN}`, { tags: { name: "qr_resolve" } });
  const qrOk = check(qrRes, {
    "qr status 200 or 404": (r) => r.status === 200 || r.status === 404,
    "qr p95 reasonable": (r) => r.timings.duration < 10000,
  });
  errorRate.add(!qrOk);
  sleep(0.5);

  let restaurantId = RESTAURANT_ID;
  if (qrRes.status === 200) {
    try {
      const body = qrRes.json();
      if (body && body.restaurantId) restaurantId = body.restaurantId;
    } catch (_) {}
  }

  // 2) Load menu
  const menuRes = http.get(`${BASE}/api/menu?restaurantId=${restaurantId}`, { tags: { name: "menu" } });
  const menuOk = check(menuRes, {
    "menu status 200 or 400": (r) => r.status === 200 || r.status === 400,
    "menu p95 reasonable": (r) => r.timings.duration < 10000,
  });
  errorRate.add(!menuOk);
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
[qr-flow] VUs: ${(m.vus && m.vus.values && m.vus.values.max) || "-"} | ` +
    `p95: ${dur && dur["p(95)"] != null ? Math.round(dur["p(95)"]) + "ms" : "-"} | ` +
    `fail: ${failed && failed.rate != null ? (failed.rate * 100).toFixed(2) + "%" : "-"}
`;
}
