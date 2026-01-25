/**
 * Prometheus Metrics Collection
 * 
 * Exports metrics for:
 * - API request rate and latency
 * - Database query performance
 * - Error rates
 * - Business metrics (orders, etc.)
 */

import "server-only";
import { Counter, Histogram, Gauge, Registry } from "prom-client";

// Create metrics registry
export const register = new Registry();

// API Metrics
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "endpoint", "status"],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "endpoint"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

// Database Metrics
export const prismaQueryDuration = new Histogram({
  name: "prisma_query_duration_seconds",
  help: "Prisma query duration in seconds",
  labelNames: ["model", "operation"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const prismaConnectionPoolActive = new Gauge({
  name: "prisma_connection_pool_active",
  help: "Active database connections",
  registers: [register],
});

export const prismaConnectionPoolIdle = new Gauge({
  name: "prisma_connection_pool_idle",
  help: "Idle database connections",
  registers: [register],
});

// Business Metrics
export const ordersCreated = new Counter({
  name: "orders_created_total",
  help: "Total number of orders created",
  labelNames: ["restaurant_id", "type"],
  registers: [register],
});

export const ordersCompleted = new Counter({
  name: "orders_completed_total",
  help: "Total number of orders completed",
  labelNames: ["restaurant_id"],
  registers: [register],
});

// Error Metrics
export const errorsTotal = new Counter({
  name: "errors_total",
  help: "Total number of errors",
  labelNames: ["type", "endpoint"],
  registers: [register],
});

// System Metrics
export const activeUsers = new Gauge({
  name: "active_users",
  help: "Number of active users",
  registers: [register],
});

export const activeRestaurants = new Gauge({
  name: "active_restaurants",
  help: "Number of active restaurants",
  registers: [register],
});

/**
 * Record API request metric
 */
export function recordApiRequest(
  method: string,
  endpoint: string,
  status: number,
  duration: number
): void {
  httpRequestsTotal.inc({ method, endpoint, status: status.toString() });
  httpRequestDuration.observe({ method, endpoint }, duration / 1000);
}

/**
 * Record database query metric
 */
export function recordDbQuery(
  model: string,
  operation: string,
  duration: number
): void {
  prismaQueryDuration.observe({ model, operation }, duration / 1000);
}

/**
 * Record order creation
 */
export function recordOrderCreated(restaurantId: string, type: string): void {
  ordersCreated.inc({ restaurant_id: restaurantId, type });
}

/**
 * Record error
 */
export function recordError(type: string, endpoint: string): void {
  errorsTotal.inc({ type, endpoint });
}

