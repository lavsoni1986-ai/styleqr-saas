import "server-only";
import { Cashfree } from "cashfree-pg";

/**
 * Cashfree PG Server Utility
 *
 * Security:
 * - Server-only
 * - No hardcoded keys
 * - Individual account (No GST required)
 */

const appId =
  process.env.SKIP_ENV_VALIDATION === "true"
    ? process.env.CASHFREE_APP_ID || "test_app_id_build_only"
    : process.env.CASHFREE_APP_ID;

const secretKey =
  process.env.SKIP_ENV_VALIDATION === "true"
    ? process.env.CASHFREE_SECRET_KEY || "test_secret_build_only"
    : process.env.CASHFREE_SECRET_KEY;

if (!appId || !secretKey) {
  throw new Error(
    "CASHFREE_APP_ID and CASHFREE_SECRET_KEY are required. Set them in your environment variables."
  );
}

// TEST or sandbox = Sandbox, otherwise Production
const isSandbox =
  process.env.CASHFREE_ENV === "sandbox" || process.env.CASHFREE_ENV === "TEST";
const environment = isSandbox ? Cashfree.Environment.SANDBOX : Cashfree.Environment.PRODUCTION;

Cashfree.XClientId = appId;
Cashfree.XClientSecret = secretKey;
Cashfree.XEnvironment = environment;

export { Cashfree };
export const cashfreeAppId = appId;
export const cashfreeSecretKey = secretKey;

/**
 * Get plan amount in INR for district subscription
 */
export function getPlanAmountINR(planType: string): number {
  const amounts: Record<string, number> = {
    BASIC: parseFloat(process.env.CASHFREE_BASIC_AMOUNT_INR || "999"),
    PRO: parseFloat(process.env.CASHFREE_PRO_AMOUNT_INR || "2499"),
    ENTERPRISE: parseFloat(process.env.CASHFREE_ENTERPRISE_AMOUNT_INR || "9999"),
  };
  return amounts[planType] ?? amounts.BASIC;
}
