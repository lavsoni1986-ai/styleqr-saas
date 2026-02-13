"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, CreditCard } from "lucide-react";
import Script from "next/script";

declare global {
  interface Window {
    Cashfree?: {
      checkout: (options: {
        paymentSessionId: string;
        returnUrl?: string;
        backdrop?: boolean;
        components?: Array<"order-details" | "payment-form">;
        style?: Record<string, string | undefined>;
      }) => void;
    };
  }
}

const isSandbox =
  process.env.NEXT_PUBLIC_CASHFREE_ENV === "TEST" ||
  process.env.NEXT_PUBLIC_CASHFREE_ENV === "sandbox" ||
  !process.env.NEXT_PUBLIC_CASHFREE_ENV;
const CASHFREE_SDK = isSandbox
  ? "https://sdk.cashfree.com/js/v3/cashfree.sandbox.js"
  : "https://sdk.cashfree.com/js/v3/cashfree.js";

interface CustomerPayButtonProps {
  orderId: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function CustomerPayButton({
  orderId,
  amount,
  onSuccess,
  onError,
  disabled = false,
  className = "",
  children,
}: CustomerPayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Detect SDK already loaded by order layout (preloads Cashfree)
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.Cashfree?.checkout === "function") {
      setSdkReady(true);
    }
  }, []);

  const handlePay = useCallback(async () => {
    if (loading || disabled || !sdkReady) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create payment");
      }

      const { payment_session_id } = data;

      if (!payment_session_id) {
        throw new Error("Invalid response from server");
      }

      if (typeof window.Cashfree?.checkout !== "function") {
        throw new Error("Payment SDK not loaded");
      }

      const returnUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/order/${orderId}?payment=success`
          : undefined;

      window.Cashfree.checkout({
        paymentSessionId: payment_session_id,
        returnUrl,
        backdrop: true,
        components: ["order-details", "payment-form"],
        style: {
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          theme: "dark",
          fontFamily: "inherit",
          fontSize: "16px",
          fontWeight: "500",
          errorColor: "#f87171",
        },
      });

      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [orderId, amount, loading, disabled, sdkReady, onSuccess, onError]);

  return (
    <>
      <Script
        src={CASHFREE_SDK}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />
      <button
        type="button"
        onClick={handlePay}
        disabled={loading || disabled || !sdkReady || amount <= 0}
        className={
          className ||
          "w-full py-4 bg-amber-500 text-zinc-950 font-bold text-lg rounded-xl hover:bg-amber-400 active:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors touch-manipulation shadow-lg"
        }
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Opening checkout...
          </>
        ) : !sdkReady ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading payment...
          </>
        ) : (
          children || (
            <>
              <CreditCard className="h-5 w-5" />
              Pay ₹{amount.toFixed(2)} Now
            </>
          )
        )}
      </button>
    </>
  );
}
