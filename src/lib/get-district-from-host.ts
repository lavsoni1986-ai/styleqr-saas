import "server-only";
import { headers } from "next/headers";
import { prisma } from "./prisma.server";
import { logger } from "./logger";

/**
 * Get District from Host
 * 
 * Server-only function that detects district based on request hostname.
 * Used for custom domain white-label support.
 * 
 * Security:
 * - Only returns active districts
 * - Normalizes hostname (removes www, port, protocol)
 * - Returns null if district not found or inactive
 * - Never throws raw DB errors
 * 
 * @returns District object or null
 */
export async function getDistrictFromHost(): Promise<{
  id: string;
  name: string;
  code: string;
  customDomain: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  isActive: boolean;
  isDomainVerified: boolean;
  subscriptionStatus: "INACTIVE" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
} | null> {
  try {
    const headersList = await headers();
    const host = headersList.get("host");

    if (!host) {
      return null;
    }

    // Normalize hostname:
    // 1. Remove protocol if present
    // 2. Remove www. prefix
    // 3. Remove port number
    // 4. Convert to lowercase
    let normalizedHost = host.toLowerCase();
    
    // Remove protocol (http://, https://)
    normalizedHost = normalizedHost.replace(/^https?:\/\//, "");
    
    // Remove www. prefix
    normalizedHost = normalizedHost.replace(/^www\./, "");
    
    // Remove port number (e.g., :3000, :8080)
    normalizedHost = normalizedHost.split(":")[0];
    
    // Trim whitespace
    normalizedHost = normalizedHost.trim();

    // Get main platform domain from environment
    const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 
                           process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "").replace(/^www\./, "").split(":")[0] ||
                           "stylerqrestaurant.in";

    // If host matches platform domain, return null (main platform, no district)
    if (normalizedHost === platformDomain || normalizedHost === `www.${platformDomain}`) {
      return null;
    }

    // Lookup district by customDomain (allow unverified so proxy can block them)
    const district = await prisma.district.findFirst({
      where: {
        customDomain: normalizedHost,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        customDomain: true,
        logoUrl: true,
        primaryColor: true,
        isActive: true,
        isDomainVerified: true, // Proxy uses this to block unverified domains
        subscriptionStatus: true,
      },
    });

    return district;
  } catch (error) {
    logger.error("Error getting district from host", {}, error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Get District ID from Host
 * 
 * Convenience function that returns only the district ID.
 * Returns null if no district found or if on main platform domain.
 */
export async function getDistrictIdFromHost(): Promise<string | null> {
  const district = await getDistrictFromHost();
  return district?.id || null;
}

