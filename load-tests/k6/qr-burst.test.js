/**
 * k6 Load Test: QR Scan Burst Simulation
 * 
 * Simulates:
 * - 1000 QR scans per minute
 * - Burst traffic pattern
 * - Order creation from QR scans
 * 
 * Performance Targets:
 * - P95 latency < 300ms
 * - Error rate < 0.1%
 * - No order duplication
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

const qrScanLatency = new Trend("qr_scan_latency");
const qrOrderLatency = new Trend("qr_order_latency");
const qrErrors = new Counter("qr_errors");
const errorRate = new Rate("qr_error_rate");

export const options = {
  stages: [
    { duration: "10s", target: 100 },   // Sudden burst
    { duration: "30s", target: 500 },   // Peak burst
    { duration: "20s", target: 1000 },  // Maximum burst
    { duration: "30s", target: 500 },   // Sustained
    { duration: "10s", target: 0 },     // Drop
  ],
  thresholds: {
    http_req_duration: ["p(95)<300", "p(99)<600"],
    http_req_failed: ["rate<0.001"],
    qr_scan_latency: ["p(95)<200"],
    qr_order_latency: ["p(95)<300"],
    qr_error_rate: ["rate<0.001"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const QR_TOKEN = __ENV.QR_TOKEN || "";

export default function () {
  if (!QR_TOKEN) {
    console.error("QR_TOKEN environment variable required");
    return;
  }

  // Step 1: Scan QR code (GET /api/qr)
  const qrStart = Date.now();
  const qrRes = http.get(`${BASE_URL}/api/qr?token=${QR_TOKEN}`);
  const qrDuration = Date.now() - qrStart;

  const qrCheck = check(qrRes, {
    "qr scan status 200": (r) => r.status === 200,
    "qr scan has restaurant": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.restaurantId && body.tableId;
      } catch {
        return false;
      }
    },
  });

  qrScanLatency.add(qrDuration);
  if (!qrCheck) {
    qrErrors.add(1);
    errorRate.add(1);
    return;
  } else {
    errorRate.add(0);
  }

  // Step 2: Create order from QR scan (50% of scans)
  if (Math.random() < 0.5) {
    try {
      const qrData = JSON.parse(qrRes.body);
      const menuRes = http.get(
        `${BASE_URL}/api/menu?restaurantId=${qrData.restaurantId}`
      );

      if (menuRes.status === 200) {
        const menuData = JSON.parse(menuRes.body);
        const categories = menuData.categories || [];
        const items = [];

        // Select random items
        for (const category of categories.slice(0, 2)) {
          if (category.items && category.items.length > 0) {
            const item =
              category.items[
                Math.floor(Math.random() * category.items.length)
              ];
            items.push({
              menuItemId: item.id,
              quantity: Math.floor(Math.random() * 2) + 1,
            });
          }
        }

        if (items.length > 0) {
          const orderPayload = JSON.stringify({
            restaurantId: qrData.restaurantId,
            tableId: qrData.tableId,
            type: "DINE_IN",
            items,
            idempotencyKey: `qr-${__VU}-${Date.now()}`,
          });

          const orderStart = Date.now();
          const orderRes = http.post(
            `${BASE_URL}/api/orders/v2`,
            orderPayload,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          const orderDuration = Date.now() - orderStart;

          const orderCheck = check(orderRes, {
            "order created status 201": (r) => r.status === 201,
          });

          qrOrderLatency.add(orderDuration);
          if (!orderCheck) {
            qrErrors.add(1);
            errorRate.add(1);
          } else {
            errorRate.add(0);
          }
        }
      }
    } catch (error) {
      qrErrors.add(1);
      errorRate.add(1);
    }
  }

  sleep(0.1); // High frequency requests
}

