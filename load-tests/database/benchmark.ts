/**
 * Database Benchmarking Tool
 * 
 * Benchmarks:
 * - Prisma query latency
 * - Transaction throughput
 * - Connection pool saturation
 * - Lock contention
 * - Serializable transaction impact
 */

import { PrismaClient } from "@prisma/client";
import { performance } from "perf_hooks";

const prisma = new PrismaClient();

interface BenchmarkResult {
  name: string;
  operations: number;
  totalTime: number;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  errors: number;
}

const results: BenchmarkResult[] = [];

/**
 * Benchmark simple query
 */
async function benchmarkSimpleQuery(iterations: number = 1000) {
  const latencies: number[] = [];
  let errors = 0;

  console.log(`\n📊 Benchmarking: Simple Query (${iterations} iterations)`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await prisma.user.findFirst({
        select: { id: true, email: true },
      });
      const duration = performance.now() - start;
      latencies.push(duration);
    } catch (error) {
      errors++;
      console.error(`Error in iteration ${i}:`, error);
    }
  }

  const sorted = latencies.sort((a, b) => a - b);
  const result: BenchmarkResult = {
    name: "Simple Query",
    operations: iterations,
    totalTime: latencies.reduce((a, b) => a + b, 0),
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    errors,
  };

  results.push(result);
  printResult(result);
}

/**
 * Benchmark complex query with joins
 */
async function benchmarkComplexQuery(iterations: number = 100) {
  const latencies: number[] = [];
  let errors = 0;

  console.log(`\n📊 Benchmarking: Complex Query with Joins (${iterations} iterations)`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await prisma.restaurant.findFirst({
        include: {
          categories: {
            include: {
              items: true,
            },
          },
          orders: {
            take: 10,
          },
        },
      });
      const duration = performance.now() - start;
      latencies.push(duration);
    } catch (error) {
      errors++;
      console.error(`Error in iteration ${i}:`, error);
    }
  }

  const sorted = latencies.sort((a, b) => a - b);
  const result: BenchmarkResult = {
    name: "Complex Query with Joins",
    operations: iterations,
    totalTime: latencies.reduce((a, b) => a + b, 0),
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    errors,
  };

  results.push(result);
  printResult(result);
}

/**
 * Benchmark transaction throughput
 */
async function benchmarkTransactions(iterations: number = 100) {
  const latencies: number[] = [];
  let errors = 0;

  console.log(`\n📊 Benchmarking: Transaction Throughput (${iterations} iterations)`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await prisma.$transaction(async (tx) => {
        // Simulate order creation transaction
        const restaurant = await tx.restaurant.findFirst({
          select: { id: true },
        });

        if (restaurant) {
          await tx.order.findMany({
            where: { restaurantId: restaurant.id },
            take: 1,
          });
        }
      });
      const duration = performance.now() - start;
      latencies.push(duration);
    } catch (error) {
      errors++;
      console.error(`Error in iteration ${i}:`, error);
    }
  }

  const sorted = latencies.sort((a, b) => a - b);
  const result: BenchmarkResult = {
    name: "Transaction Throughput",
    operations: iterations,
    totalTime: latencies.reduce((a, b) => a + b, 0),
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    errors,
  };

  results.push(result);
  printResult(result);
}

/**
 * Benchmark serializable transaction impact
 */
async function benchmarkSerializableTransactions(iterations: number = 50) {
  const latencies: number[] = [];
  let errors = 0;

  console.log(
    `\n📊 Benchmarking: Serializable Transactions (${iterations} iterations)`
  );

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await prisma.$transaction(
        async (tx) => {
          // Simulate order creation with serializable isolation
          const restaurant = await tx.restaurant.findFirst({
            select: { id: true },
          });

          if (restaurant) {
            await tx.order.findMany({
              where: { restaurantId: restaurant.id },
              take: 1,
            });
          }
        },
        {
          isolationLevel: "Serializable",
          maxWait: 5000,
          timeout: 10000,
        }
      );
      const duration = performance.now() - start;
      latencies.push(duration);
    } catch (error) {
      errors++;
      if (error instanceof Error && error.message.includes("P2034")) {
        // Transaction conflict - expected with serializable
        console.warn(`Transaction conflict in iteration ${i} (expected)`);
      } else {
        console.error(`Error in iteration ${i}:`, error);
      }
    }
  }

  const sorted = latencies.sort((a, b) => a - b);
  const result: BenchmarkResult = {
    name: "Serializable Transactions",
    operations: iterations,
    totalTime: latencies.reduce((a, b) => a + b, 0),
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    errors,
  };

  results.push(result);
  printResult(result);
}

/**
 * Benchmark connection pool saturation
 */
async function benchmarkConnectionPool(concurrent: number = 20) {
  const latencies: number[] = [];
  let errors = 0;

  console.log(
    `\n📊 Benchmarking: Connection Pool Saturation (${concurrent} concurrent)`
  );

  const promises = Array.from({ length: concurrent }, async () => {
    const start = performance.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const duration = performance.now() - start;
      latencies.push(duration);
    } catch (error) {
      errors++;
      console.error("Connection pool error:", error);
    }
  });

  await Promise.all(promises);

  const sorted = latencies.sort((a, b) => a - b);
  const result: BenchmarkResult = {
    name: "Connection Pool Saturation",
    operations: concurrent,
    totalTime: latencies.reduce((a, b) => a + b, 0),
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    errors,
  };

  results.push(result);
  printResult(result);
}

function printResult(result: BenchmarkResult) {
  console.log(`\n✅ ${result.name}:`);
  console.log(`   Operations: ${result.operations}`);
  console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
  console.log(`   Average Latency: ${result.avgLatency.toFixed(2)}ms`);
  console.log(`   P50: ${result.p50.toFixed(2)}ms`);
  console.log(`   P95: ${result.p95.toFixed(2)}ms`);
  console.log(`   P99: ${result.p99.toFixed(2)}ms`);
  console.log(`   Errors: ${result.errors}`);
  console.log(
    `   Throughput: ${((result.operations / result.totalTime) * 1000).toFixed(2)} ops/sec`
  );
}

async function runBenchmarks() {
  console.log("🔥 Starting Database Benchmarks\n");

  try {
    await benchmarkSimpleQuery(1000);
    await benchmarkComplexQuery(100);
    await benchmarkTransactions(100);
    await benchmarkSerializableTransactions(50);
    await benchmarkConnectionPool(20);

    console.log("\n📊 Summary:");
    console.log("=".repeat(60));
    results.forEach((result) => {
      console.log(
        `${result.name.padEnd(30)} | P95: ${result.p95.toFixed(2)}ms | Errors: ${result.errors}`
      );
    });
  } catch (error) {
    console.error("Benchmark error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runBenchmarks();

