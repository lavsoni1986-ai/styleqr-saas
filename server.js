#!/usr/bin/env node

/**
 * Production server wrapper for Next.js standalone output
 * Ensures proper PORT and 0.0.0.0 binding for Railway/Docker deployments
 */

const http = require("http");
const port = parseInt(process.env.PORT || "8080", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";

// Patch http.Server.prototype.listen to ensure 0.0.0.0 binding
const originalListen = http.Server.prototype.listen;
http.Server.prototype.listen = function(...args) {
  // Normalize: ensure hostname is always 0.0.0.0
  if (args.length === 0) {
    args = [port, hostname];
  } else if (args.length === 1) {
    // Only port: listen(port) -> listen(port, "0.0.0.0")
    args = [args[0], hostname];
  } else if (args.length === 2) {
    if (typeof args[1] === "function") {
      // Port and callback: listen(port, callback) -> listen(port, "0.0.0.0", callback)
      args = [args[0], hostname, args[1]];
    } else {
      // Port and hostname: listen(port, hostname) -> listen(port, "0.0.0.0")
      args[1] = hostname;
    }
  } else if (args.length === 3 && typeof args[2] === "function") {
    // Port, hostname, callback: ensure hostname is "0.0.0.0"
    args[1] = hostname;
  }
  return originalListen.apply(this, args);
};

// Load and execute the original Next.js standalone server
try {
  require("./server.original.js");
} catch (error) {
  console.error("❌ Failed to start Next.js server:", error);
  process.exit(1);
}

