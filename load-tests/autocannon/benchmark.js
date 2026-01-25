/**
 * Autocannon Micro-Benchmark
 * 
 * Quick performance tests for individual endpoints
 * Usage: node load-tests/autocannon/benchmark.js
 */

const autocannon = require("autocannon");
const { writeFileSync } = require("fs");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = process.env.AUTH_TOKEN || "";

const endpoints = [
  {
    name: "Health Check",
    url: "/api/health",
    method: "GET",
  },
  {
    name: "Restaurant List",
    url: "/api/restaurants",
    method: "GET",
    headers: {
      Cookie: `next-auth.session-token=${AUTH_TOKEN}`,
    },
  },
  {
    name: "Menu Categories",
    url: "/api/menus/categories?restaurantId=test-id",
    method: "GET",
    headers: {
      Cookie: `next-auth.session-token=${AUTH_TOKEN}`,
    },
  },
];

async function benchmarkEndpoint(endpoint) {
  console.log(`\n🚀 Benchmarking: ${endpoint.name}`);
  console.log(`   ${endpoint.method} ${endpoint.url}`);

  const instance = autocannon(
    {
      url: `${BASE_URL}${endpoint.url}`,
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
        ...endpoint.headers,
      },
      connections: 10,
      pipelining: 1,
      duration: 30,
    },
    (err, result) => {
      if (err) {
        console.error(`❌ Error: ${err.message}`);
        return;
      }

      console.log(`\n📊 Results for ${endpoint.name}:`);
      console.log(`   Requests: ${result.requests.total}`);
      console.log(`   Throughput: ${(result.throughput.total / 1024).toFixed(2)} KB/s`);
      console.log(`   Latency:`);
      console.log(`     Average: ${result.latency.average}ms`);
      console.log(`     P50: ${result.latency.p50}ms`);
      console.log(`     P90: ${result.latency.p90}ms`);
      console.log(`     P95: ${result.latency.p95}ms`);
      console.log(`     P99: ${result.latency.p99}ms`);
      console.log(`   Errors: ${result.errors}`);
      console.log(`   Timeouts: ${result.timeouts}`);

      // Save results
      const filename = `load-tests/results/${endpoint.name
        .toLowerCase()
        .replace(/\s+/g, "-")}-${Date.now()}.json`;
      writeFileSync(filename, JSON.stringify(result, null, 2));
      console.log(`   Results saved to: ${filename}`);
    }
  );

  // Track progress
  autocannon.track(instance, {
    renderProgressBar: true,
    renderResultsTable: false,
  });
}

async function runBenchmarks() {
  console.log("🔥 Starting Autocannon Benchmarks");
  console.log(`   Target: ${BASE_URL}`);

  for (const endpoint of endpoints) {
    await benchmarkEndpoint(endpoint);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait between tests
  }

  console.log("\n✅ All benchmarks completed");
}

runBenchmarks().catch(console.error);

