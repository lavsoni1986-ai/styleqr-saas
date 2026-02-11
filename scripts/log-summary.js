#!/usr/bin/env node
/**
 * Log Summary Script - Aggregate logs for past 24 hours
 *
 * Usage:
 *   node scripts/log-summary.js [logfile]
 *   cat app.log | node scripts/log-summary.js
 *
 * Summarizes:
 *   - error count
 *   - warn count
 *   - financial alerts
 *   - rate-limit hits (429)
 */

const fs = require("fs");
const readline = require("readline");

const HOURS_24_MS = 24 * 60 * 60 * 1000;

const summary = {
  errors: 0,
  warns: 0,
  financialAlerts: 0,
  rateLimitHits: 0,
};

function parseTimestamp(line) {
  try {
    const m = line.match(/"time":"([^"]+)"/);
    if (m) return new Date(m[1]).getTime();
    const m2 = line.match(/"timestamp":"([^"]+)"/);
    if (m2) return new Date(m2[1]).getTime();
  } catch {}
  return Date.now();
}

function isWithin24h(ts) {
  return Date.now() - ts < HOURS_24_MS;
}

function processLine(line) {
  const ts = parseTimestamp(line);
  if (!isWithin24h(ts)) return;

  if (line.includes('"level":"error"') || line.includes('"level": "error"')) summary.errors++;
  if (line.includes('"level":"warn"') || line.includes('"level": "warn"')) summary.warns++;
  if (line.includes("[FINANCIAL_ALERT]") || line.includes("Financial Alert:")) summary.financialAlerts++;
  if (line.includes("Rate limit exceeded") || line.includes("rate limit exceeded")) summary.rateLimitHits++;
}

async function main() {
  const input = process.argv[2];
  const stream = input
    ? fs.createReadStream(input, { encoding: "utf8" })
    : process.stdin;

  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    processLine(line);
  }

  console.log(JSON.stringify(summary, null, 2));
  console.log("\n--- Summary (past 24h) ---");
  console.log(`Errors: ${summary.errors}`);
  console.log(`Warns: ${summary.warns}`);
  console.log(`Financial alerts: ${summary.financialAlerts}`);
  console.log(`Rate-limit hits (429): ${summary.rateLimitHits}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
