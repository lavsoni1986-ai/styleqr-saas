/**
 * Edge-safe domain resolver utilities
 * NO Prisma, NO Node APIs - safe for middleware/edge runtime
 */

/**
 * Extract subdomain from hostname (edge-safe)
 * e.g., "delhi.styleqr.com" -> "delhi"
 * e.g., "localhost:3000" -> null
 */
export function resolveTenantDomain(host: string): string | null {
  if (!host) return null;

  // Remove protocol if present
  let hostname = host.replace(/^https?:\/\//, "");

  // Remove port if present
  hostname = hostname.split(":")[0];

  // Remove path if present
  hostname = hostname.split("/")[0];

  // Skip localhost and IP addresses
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // Extract subdomain
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    return parts[0].toLowerCase();
  }

  return null;
}

/**
 * Normalize domain for matching (edge-safe)
 * Removes protocol, port, and path
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return "";

  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/:\d+$/, "")
    .split("/")[0]
    .trim();
}
