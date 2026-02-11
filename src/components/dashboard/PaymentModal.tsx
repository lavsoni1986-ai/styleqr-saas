"use client";

import { useState, useRef, useEffect } from "react";
import { X, Loader2, CreditCard, Smartphone, Wallet, QrCode } from "lucide-react";
import { PaymentMethod } from "@prisma/client";
import { offlineQueue } from "@/lib/offline/queue.engine";
import { networkMonitor } from "@/lib/offline/network.monitor";
import { logPayment, logError } from "@/lib/observability/logger";
import CashfreeButton from "./CashfreeButton";

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
        className="dark-modal flex flex-col bg-[#0B0F14] w-full max-md:max-h-[90vh] max-md:rounded-t-3xl max-md:rounded-b-none md:max-w-[480px] md:rounded-2xl md:max-h-[85vh] shadow-xl overflow-hidden border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0" noValidate>
          {/* Header — sticky */}
          <header className="flex-shrink-0 border-b border-gray-800 bg-[#0B0F14]">
            {/* Mobile: swipe-down handle */}
            <div
              className="md:hidden flex justify-center pt-3 pb-1"
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={handleSwipeClose}
              aria-hidden
            >
              <div className="w-12 h-1.5 rounded-full bg-gray-600" />
            </div>
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-2">
              <div>
                <h2 id="payment-modal-title" className="text-lg font-bold text-white">
                  Bill #{bill.billNumber}
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                  <span className="text-gray-400">Total <strong className="text-white">₹{bill.total.toFixed(2)}</strong></span>
                  <span className="text-gray-400">Paid <strong className="text-emerald-400">₹{bill.paidAmount.toFixed(2)}</strong></span>
                  <span className="text-gray-400">Balance <strong className="text-amber-500">₹{balance.toFixed(2)}</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 p-3 -m-2 rounded-xl hover:bg-gray-800 active:bg-gray-700 transition-colors touch-manipulation text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </header>

          {/* Content — scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5">
            {/* Payment method grid (2x2) */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-white mb-3">Payment method</label>
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
                          ? "border-amber-500 bg-amber-500/20"
                          : "border-gray-800 bg-[#1A1F26] hover:border-gray-700 hover:bg-gray-800/50"
                      }`}
                    >
                      <Icon className={`h-7 w-7 ${selected ? "text-amber-500" : "text-gray-500"}`} />
                      <span className={`text-sm font-semibold ${selected ? "text-amber-400" : "text-gray-400"}`}>
                        {pm.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount with ₹ prefix */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-white mb-2">Amount</label>
              <div className="flex items-center bg-[#1A1F26] border-2 border-gray-800 rounded-xl overflow-hidden focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20 transition-shadow">
                <span className="pl-4 text-gray-500 font-semibold text-lg">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 py-3.5 pr-4 border-0 bg-transparent focus:ring-0 text-lg font-semibold text-white placeholder:text-gray-500"
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
                    className="py-2.5 rounded-xl bg-[#1A1F26] border border-gray-800 hover:bg-gray-800 hover:border-gray-700 active:bg-gray-700 text-gray-300 font-semibold text-sm transition-colors touch-manipulation"
                  >
                    {p === 100 ? "Full" : `${p}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Cashfree online checkout (UPI / CARD / QR) */}
            {method !== "CASH" && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gray-800" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
                  <div className="h-px flex-1 bg-gray-800" />
                </div>
                <CashfreeButton
                  billId={bill.id}
                  amount={amountNum}
                  onSuccess={() => {
                    onPaymentSuccess();
                    onClose();
                  }}
                  onError={setError}
                  disabled={amountNum <= 0 || amountNum > balance + 0.01}
                  className="w-full py-3.5 bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 font-semibold rounded-xl hover:bg-amber-500/30 hover:border-amber-500/70 transition-colors flex items-center justify-center gap-2"
                />
              </div>
            )}

            {/* Reference (for non-cash, manual entry) */}
            {method !== "CASH" && (
              <div className="mb-5">
                <label className="block text-sm font-semibold text-white mb-2">
                  {method === "UPI" && "UPI Transaction ID (manual)"}
                  {method === "CARD" && "Card Transaction ID (manual)"}
                  {method === "QR" && "QR Transaction ID (manual)"}
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Enter transaction reference if paid offline..."
                  className="w-full px-4 py-3 bg-[#1A1F26] border-2 border-gray-800 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 text-white placeholder:text-gray-500 outline-none transition-colors"
                />
              </div>
            )}

            {/* Notes (optional) */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-white mb-2">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="w-full px-4 py-3 bg-[#1A1F26] border-2 border-gray-800 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 text-white placeholder:text-gray-500 outline-none resize-none transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer — sticky, big primary PAY button */}
          <footer className="flex-shrink-0 border-t border-gray-800 bg-[#0B0F14] p-4 safe-area-inset-bottom">
            <button
              type="submit"
              disabled={loading || amountNum <= 0 || amountNum > balance + 0.01}
              className="w-full py-4 bg-amber-500 text-zinc-950 font-bold text-lg rounded-xl hover:bg-amber-400 active:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors touch-manipulation shadow-lg shadow-amber-900/20"
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
