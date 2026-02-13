"use client";

import Script from "next/script";

const isSandbox =
  process.env.NEXT_PUBLIC_CASHFREE_ENV === "TEST" ||
  process.env.NEXT_PUBLIC_CASHFREE_ENV === "sandbox" ||
  !process.env.NEXT_PUBLIC_CASHFREE_ENV;
const CASHFREE_SDK = isSandbox
  ? "https://sdk.cashfree.com/js/v3/cashfree.sandbox.js"
  : "https://sdk.cashfree.com/js/v3/cashfree.js";

/**
 * Preloads Cashfree SDK so Pay buttons are clickable immediately.
 * Use in layouts where payment is needed (dashboard, order tracking).
 */
export function CashfreeScript() {
  return <Script src={CASHFREE_SDK} strategy="beforeInteractive" />;
}
