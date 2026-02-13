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
        style?: {
          backgroundColor?: string;
          color?: string;
          fontFamily?: string;
          fontSize?: string;
          fontWeight?: string;
          errorColor?: string;
          theme?: "light" | "dark";
        };
      }) => void;
    };
  }
}

interface CashfreeButtonProps {
  billId: string;
  amount: number;
  orderId?: string;
  returnUrl?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const LAV_DARK_BG = "#0B0F14";
const isSandbox =
  process.env.NEXT_PUBLIC_CASHFREE_ENV === "TEST" ||
  process.env.NEXT_PUBLIC_CASHFREE_ENV === "sandbox" ||
  !process.env.NEXT_PUBLIC_CASHFREE_ENV;
const CASHFREE_SDK = isSandbox
  ? "https://sdk.cashfree.com/js/v3/cashfree.sandbox.js"
  : "https://sdk.cashfree.com/js/v3/cashfree.js";

export default function CashfreeButton({
  billId,
  amount,
  orderId,
  returnUrl,
  onSuccess,
  onError,
  disabled = false,
  className = "",
  children,
}: CashfreeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Poll for SDK (handles cases where onLoad was missed)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      if (typeof window.Cashfree?.checkout === "function") {
        setSdkReady(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const id = setInterval(() => {
      if (check()) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const handlePay = useCallback(async () => {
    if (loading || disabled) return;

    if (typeof window.Cashfree?.checkout !== "function") {
      alert("Payment system still loading, please try again");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId, amount, orderId: orderId || undefined }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create payment order");
      }

      const { payment_session_id } = data;

      if (!payment_session_id) {
        throw new Error("Invalid response from server");
      }

      if (typeof window.Cashfree?.checkout !== "function") {
        alert("Payment system still loading, please try again");
        setLoading(false);
        return;
      }

      window.Cashfree.checkout({
        paymentSessionId: payment_session_id,
        returnUrl: returnUrl || window.location.origin + "/dashboard/payments",
        backdrop: true,
        components: ["order-details", "payment-form"],
        style: {
          backgroundColor: LAV_DARK_BG,
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
  }, [billId, amount, orderId, returnUrl, loading, disabled, onSuccess, onError]);

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
        disabled={loading || disabled || amount <= 0}
        className={
          className ||
          "w-full py-4 bg-amber-500 text-zinc-950 font-bold text-lg rounded-xl hover:bg-amber-400 active:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors touch-manipulation shadow-lg shadow-amber-900/20"
        }
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Opening checkout...
          </>
        ) : (
          children || (
            <>
              <CreditCard className="h-5 w-5" />
              Pay ₹{amount.toFixed(2)} with Card / UPI
            </>
          )
        )}
      </button>
    </>
  );
}
