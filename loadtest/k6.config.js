/**
 * k6 Shared Configuration
 * Used by loadtest/scenarios/*.test.js
 *
 * Environment:
 *   BASE_URL     - e.g. http://localhost:3000 or http://192.168.31.135:3000
 *   VUS         - 100 | 500 | 1000 (default 100)
 */

/**
 * @param {number} [defaultVus=100]
 * @returns {import('k6/options').Options}
 */
export function getOptions(defaultVus = 100) {
  const vus = Math.min(Math.max(1, Number(__ENV.VUS) || defaultVus), 2000);
  const ramp = Math.ceil(vus * 0.5);

  return {
    stages: [
      { duration: "30s", target: Math.min(ramp, vus) },
      { duration: "1m", target: vus },
      { duration: "2m", target: vus },
      { duration: "30s", target: 0 },
    ],
    thresholds: {
      "http_req_duration": ["p(95)<5000"],
      "http_req_failed": ["rate<0.1"],
    },
  };
}
