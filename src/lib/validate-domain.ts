import "server-only";
import { prisma } from "./prisma.server";
import { logger } from "./logger";

/**
 * Validate Domain
 * 
 * Server-side domain validation for custom domain white-label support.
 * Checks if domain is registered and active.
 * 
 * @param hostname - Normalized hostname from request
 * @returns true if domain is valid (platform domain or registered active district domain)
 */
export async function validateDomain(hostname: string): Promise<boolean> {
  try {
    // Normalize hostname
    let normalized = hostname.toLowerCase();
    normalized = normalized.replace(/^https?:\/\//, "");
    normalized = normalized.replace(/^www\./, "");
    normalized = normalized.split(":")[0];
    normalized = normalized.trim();

    // Get platform domain
    const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 
                           process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "").replace(/^www\./, "").split(":")[0] ||
                           "stylerqrestaurant.in";

    // Allow platform domain
    if (normalized === platformDomain || normalized === `www.${platformDomain}`) {
      return true;
    }

    // Allow localhost for development
    if (normalized === "localhost" || normalized.startsWith("localhost:") || /^\d+\.\d+\.\d+\.\d+/.test(normalized)) {
      return true;
    }

    // Check if domain is registered as active district custom domain
    const district = await prisma.district.findFirst({
      where: {
        customDomain: normalized,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return !!district;
  } catch (error) {
    logger.error("Error validating domain", { hostname: hostname.substring(0, 64) }, error instanceof Error ? error : undefined);
    if (process.env.SENTRY_DSN) {
      import("@sentry/nextjs").then((S) => S.captureException(error)).catch(() => {});
    }
    return false;
  }
}

/**
 * Check if domain is inactive district
 * Returns true if domain exists but is inactive (for 404 response)
 */
export async function isInactiveDistrictDomain(hostname: string): Promise<boolean> {
  try {
    let normalized = hostname.toLowerCase();
    normalized = normalized.replace(/^https?:\/\//, "");
    normalized = normalized.replace(/^www\./, "");
    normalized = normalized.split(":")[0];
    normalized = normalized.trim();

    const district = await prisma.district.findFirst({
      where: {
        customDomain: normalized,
        isActive: false,
      },
      select: {
        id: true,
      },
    });

    return !!district;
  } catch (error) {
    return false;
  }
}

