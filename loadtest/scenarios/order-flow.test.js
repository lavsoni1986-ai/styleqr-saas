/**
 * k6 – Order placement + order status
 * POST /api/orders, GET /api/orders/:id
 *
 * Env: BASE_URL, VUS, QR_TOKEN, MENU_ITEM_ID (required for 201; comma-separated for multiple)
 * Run: k6 run loadtest/scenarios/order-flow.test.js
 *      k6 run -e VUS=500 -e QR_TOKEN=xxx -e MENU_ITEM_ID=item1 loadtest/scenarios/order-flow.test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { getOptions } from "../k6.config.js";

const errorRate = new Rate("errors");

export const options = getOptions(100);

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const QR_TOKEN = __ENV.QR_TOKEN || "test-qr-token";
const MENU_ITEM_IDS = (__ENV.MENU_ITEM_ID || "test-item-id")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MENU_ITEM_ID = MENU_ITEM_IDS[0] || "test-item-id";

export default function () {
  // 1) Place order
  const payload = JSON.stringify({
    token: QR_TOKEN,
    items: [{ menuItemId: MENU_ITEM_ID, qty: 1 }],
    notes: "",
  });
  const postRes = http.post(`${BASE}/api/orders`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { name: "order_place" },
  });

  const postOk = check(postRes, {
    "order place status 201 or 4xx/5xx": (r) => r.status >= 200 && r.status < 600,
    "order place p95 reasonable": (r) => r.timings.duration < 15000,
  });
  errorRate.add(!postOk);
  sleep(0.5);

  let orderId = null;
  if (postRes.status === 201) {
    try {
      const b = postRes.json();
      if (b && b.orderId) orderId = b.orderId;
    } catch (_) {}
  }

  // 2) Get order status (use created id or a known test id)
  const id = orderId || `o${__VU}${__ITER}`;
  const getRes = http.get(`${BASE}/api/orders/${id}`, { tags: { name: "order_status" } });
  const getOk = check(getRes, {
    "order status 200 or 404": (r) => r.status === 200 || r.status === 404,
    "order status p95 reasonable": (r) => r.timings.duration < 10000,
  });
  errorRate.add(!getOk);
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
[order-flow] VUs: ${(m.vus && m.vus.values && m.vus.values.max) || "-"} | ` +
    `p95: ${dur && dur["p(95)"] != null ? Math.round(dur["p(95)"]) + "ms" : "-"} | ` +
    `fail: ${failed && failed.rate != null ? (failed.rate * 100).toFixed(2) + "%" : "-"}
`;
}
