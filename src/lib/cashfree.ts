import "server-only";
import crypto from "crypto";
import { Cashfree, CFEnvironment } from "cashfree-pg";

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
const environment = isSandbox ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;

const cashfreeInstance = new Cashfree(environment, appId, secretKey);

export { Cashfree, cashfreeInstance };
export const cashfreeAppId = appId;
export const cashfreeSecretKey = secretKey;

/**
 * Verify Cashfree webhook signature (HMAC-SHA256).
 * Uses raw body as required by Cashfree.
 * @see https://docs.cashfree.com/docs/payments/online/webhooks/signature-verification
 */
export function verifyWebhookSignature(
  signature: string,
  rawBody: string,
  timestamp: string
): void {
  const body = timestamp + rawBody;
  const key = secretKey as string; // guarded at module load
  const generatedSignature = crypto
    .createHmac("sha256", key)
    .update(body)
    .digest("base64");
  if (generatedSignature !== signature) {
    throw new Error("Generated signature and received signature did not match.");
  }
}

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
