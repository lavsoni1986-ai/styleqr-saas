"use client";

import { useState, useRef, useEffect } from "react";
import { X, Loader2, CreditCard, Smartphone, Wallet, QrCode } from "lucide-react";
import { PaymentMethod } from "@prisma/client";
import { offlineQueue } from "@/lib/offline/queue.engine";
import { networkMonitor } from "@/lib/offline/network.monitor";
import { logPayment, logError } from "@/lib/observability/logger";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: {
    id: string;
    billNumber: string;
    total: number;
    paidAmount: number;
    balance: number;
  };
  onPaymentSuccess: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  bill,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState<string>(bill.balance.toFixed(2));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const touchStartY = useRef<number>(0);

  // Esc closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const balance = bill.balance;
  const amountNum = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amountNum <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    if (amountNum > balance + 0.01) {
      setError(`Amount cannot exceed balance of ₹${balance.toFixed(2)}`);
      return;
    }

    // Require reference for non-cash payments
    if (method !== "CASH" && !reference.trim()) {
      setError("Payment reference is required for this payment method");
      return;
    }

    setLoading(true);

    const paymentData = {
      billId: bill.id,
      method,
      amount: amountNum,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
    };

    const isOnline = networkMonitor.isOnline();

    try {
      if (isOnline) {
        // Try API call first
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentData),
        });

        const data = await res.json().catch(() => null);

        if (res.ok) {
          // Success
          logPayment("Payment processed successfully", {
            billId: bill.id,
            method,
            amount: amountNum,
            reference: reference.trim() || null,
          });

          setAmount(balance.toFixed(2));
          setReference("");
          setNotes("");
          onPaymentSuccess();
          setLoading(false);
          return;
        }

        // API failed - queue it
        // Payment API failed, queueing payment (silent in production)
        setError("Payment queued. Will sync when connection is restored.");
      }

      // Queue payment (offline or API failed)
      const queueId = await offlineQueue.enqueue({
        type: "ADD_PAYMENT",
        data: paymentData,
      });

      logPayment("Payment queued for sync", {
        queueId,
        billId: bill.id,
        method,
        amount: amountNum,
        offline: !isOnline,
      });

      // Optimistic success
      setAmount(balance.toFixed(2));
      setReference("");
      setNotes("");
      onPaymentSuccess();

      if (isOnline) {
        // API failed but queued - show warning
        setError("Payment queued. Will sync when connection is restored.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      logError("Payment failed", { error: String(err), billId: bill.id, method, amount: amountNum }, "payment");

      // Still try to queue
      try {
        await offlineQueue.enqueue({
          type: "ADD_PAYMENT",
          data: paymentData,
        });
        setError("Payment queued. Will sync when connection is restored.");
        onPaymentSuccess(); // Optimistic success
      } catch (queueErr) {
        setError("Failed to process payment. Please try again.");
        console.error("Queue failed:", queueErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeClose = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 60) onClose();
  };

  const paymentMethods = [
    { value: "CASH" as PaymentMethod, label: "Cash", icon: Wallet },
    { value: "UPI" as PaymentMethod, label: "UPI", icon: Smartphone },
    { value: "CARD" as PaymentMethod, label: "Card", icon: CreditCard },
    { value: "QR" as PaymentMethod, label: "QR Code", icon: QrCode },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex max-md:items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        className="flex flex-col bg-white w-full max-md:max-h-[90vh] max-md:rounded-t-3xl max-md:rounded-b-none md:max-w-[480px] md:rounded-2xl md:max-h-[85vh] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0" noValidate>
          {/* Header — sticky */}
          <header className="flex-shrink-0 border-b border-slate-200 bg-white">
            {/* Mobile: swipe-down handle */}
            <div
              className="md:hidden flex justify-center pt-3 pb-1"
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={handleSwipeClose}
              aria-hidden
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-2">
              <div>
                <h2 id="payment-modal-title" className="text-lg font-bold text-slate-900">
                  Bill #{bill.billNumber}
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                  <span className="text-slate-600">Total <strong className="text-slate-900">₹{bill.total.toFixed(2)}</strong></span>
                  <span className="text-slate-600">Paid <strong className="text-emerald-600">₹{bill.paidAmount.toFixed(2)}</strong></span>
                  <span className="text-slate-600">Balance <strong className="text-orange-600">₹{balance.toFixed(2)}</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 p-3 -m-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors touch-manipulation"
                aria-label="Close"
              >
                <X className="h-6 w-6 text-slate-600" />
              </button>
            </div>
          </header>

          {/* Content — scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5">
            {/* Payment method grid (2x2) */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-3">Payment method</label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((pm) => {
                  const Icon = pm.icon;
                  const selected = method === pm.value;
                  return (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => {
                        setMethod(pm.value);
                        setReference("");
                      }}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all touch-manipulation ${
                        selected
                          ? "border-orange-500 bg-orange-50 shadow-sm"
                          : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className={`h-7 w-7 ${selected ? "text-orange-600" : "text-slate-500"}`} />
                      <span className={`text-sm font-semibold ${selected ? "text-orange-700" : "text-slate-700"}`}>
                        {pm.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount with ₹ prefix */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Amount</label>
              <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-shadow">
                <span className="pl-4 text-slate-500 font-semibold text-lg">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 py-3.5 pr-4 border-0 focus:ring-0 text-lg font-semibold text-slate-900 placeholder:text-slate-400"
                  placeholder="0.00"
                  required
                />
              </div>
              {/* Quick: 25%, 50%, 75%, Full */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setAmount(p < 100 ? (balance * (p / 100)).toFixed(2) : balance.toFixed(2))
                    }
                    className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-sm transition-colors touch-manipulation"
                  >
                    {p === 100 ? "Full" : `${p}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference (for non-cash) */}
            {method !== "CASH" && (
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {method === "UPI" && "UPI Transaction ID"}
                  {method === "CARD" && "Card Transaction ID"}
                  {method === "QR" && "QR Transaction ID"}
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Enter transaction reference..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-colors"
                  required
                />
              </div>
            )}

            {/* Notes (optional) */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer — sticky, big primary PAY button */}
          <footer className="flex-shrink-0 border-t border-slate-200 bg-white p-4 safe-area-inset-bottom">
            <button
              type="submit"
              disabled={loading || amountNum <= 0 || amountNum > balance + 0.01}
              className="w-full py-4 bg-orange-600 text-white font-bold text-lg rounded-xl hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors touch-manipulation shadow-lg shadow-orange-900/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                `PAY ₹${amountNum.toFixed(2)}`
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
