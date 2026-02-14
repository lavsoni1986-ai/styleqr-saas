"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { getCloudinaryThumbnail } from "@/lib/cloudinary";
import {
  Clock,
  CheckCircle,
  ChefHat,
  Loader2,
  UtensilsCrossed,
  AlertCircle,
  CreditCard,
  RefreshCcw,
  Banknote,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";
import CustomerPayButton from "@/components/order/CustomerPayButton";
import { setActiveOrder, clearActiveOrder } from "@/lib/active-order-storage";

type OrderItem = {
  id: string;
  menuItem: {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
  };
  quantity: number;
  price: number;
};

type OrderData = {
  id: string;
  status: OrderStatus;
  type: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  restaurant: {
    id: string;
    name: string;
  };
  table: {
    id: string;
    name: string | null;
  } | null;
  items: OrderItem[];
  bill?: { id: string; billNumber: string; balance: number } | null;
};

export default function OrderTrackingClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [payError, setPayError] = useState<string | null>(null);
  const [payAtCounterLoading, setPayAtCounterLoading] = useState(false);
  const servedFetchDone = useRef(false);

  const handlePayAtCounter = useCallback(async () => {
    if (payAtCounterLoading || !orderId) return;
    setPayAtCounterLoading(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay-at-counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to place order");
      }
      router.replace(`/order/${orderId}?payment=success&payAtCounter=true`);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPayAtCounterLoading(false);
    }
  }, [orderId, payAtCounterLoading, router]);

  const paymentSuccess = searchParams.get("payment") === "success";
  const payAtCounter = searchParams.get("payAtCounter") === "true";

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError("Order not found");
          clearActiveOrder(); // Stale/invalid order - allow fresh start
        } else {
          setError("Failed to load order");
        }
        setLoading(false);
        return;
      }

      const data = (await response.json()) as OrderData;
      setOrder(data);
      setError(null);

      // Persist orderId for recovery when navigating away
      if (data.status === "PAID") {
        clearActiveOrder();
      } else {
        setActiveOrder(data.id, data.restaurant.id);
      }

      // Debug: log bill data when order is ready to pay
      if (data.status === "SERVED" || data.status === "READY_TO_SERVE") {
        console.log("Mobile Bill Data:", data.bill ?? null);
      }

      // Force one extra fetch when first reaching SERVED to get latest bill
      if (
        (data.status === "SERVED" || data.status === "READY_TO_SERVE") &&
        !servedFetchDone.current
      ) {
        servedFetchDone.current = true;
        setTimeout(() => fetchOrder(), 500);
      }

      // Calculate time elapsed
      const createdAt = new Date(data.createdAt).getTime();
      const now = Date.now();
      setTimeElapsed(Math.floor((now - createdAt) / 1000));

      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }, [orderId]);

  // Initial fetch
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Auto-refresh: 3s when PREPARING (waiting for SERVED), 5s when SERVED/READY_TO_SERVE (waiting for PAID)
  useEffect(() => {
    if (loading || error || order?.status === "PAID") return;

    const waitingForServed = order?.status === "PREPARING";
    const waitingForPaid = order?.status === "SERVED" || order?.status === "READY_TO_SERVE";
    const ms = waitingForServed || waitingForPaid ? 3000 : 5000;
    const interval = setInterval(() => {
      fetchOrder();
    }, ms);

    return () => clearInterval(interval);
  }, [loading, error, order?.status, fetchOrder]);

  // Refetch when returning from payment (payment=success or payAtCounter in URL)
  useEffect(() => {
    if ((paymentSuccess || payAtCounter) && order) {
      fetchOrder();
    }
  }, [paymentSuccess, payAtCounter, order, fetchOrder]);

  // Update time elapsed every second
  useEffect(() => {
    if (!order) return;

    const interval = setInterval(() => {
      const createdAt = new Date(order.createdAt).getTime();
      const now = Date.now();
      setTimeElapsed(Math.floor((now - createdAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [order]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Pending",
          color: "bg-amber-500/20 text-amber-300 border-amber-400/40",
          icon: Clock,
          message: "Your order has been received",
        };
      case "ACCEPTED":
        return {
          label: "Accepted",
          color: "bg-blue-500/20 text-blue-300 border-blue-400/40",
          icon: CheckCircle,
          message: "Your order has been accepted",
        };
      case "PREPARING":
        return {
          label: "Preparing",
          color: "bg-orange-500/20 text-orange-300 border-orange-400/40",
          icon: ChefHat,
          message: "Your food is being prepared 🍳",
        };
      case "SERVED":
        return {
          label: "Ready",
          color: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
          icon: CheckCircle,
          message: "Your order is ready! Pay below to complete.",
        };
      case "PAID":
        return {
          label: "Paid",
          color: "bg-violet-500/20 text-violet-300 border-violet-400/40",
          icon: CreditCard,
          message: "Payment successful! Thank you for dining with us.",
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          color: "bg-red-500/20 text-red-300 border-red-400/40",
          icon: AlertCircle,
          message: "This order has been cancelled",
        };
      default:
        return {
          label: status,
          color: "bg-white/10 text-zinc-300 border-white/20",
          icon: Clock,
          message: "",
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="p-5 bg-red-500/10 rounded-2xl border border-red-400/30 inline-block mb-4">
            <AlertCircle className="h-12 w-12 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Order Not Found
          </h1>
          <p className="text-zinc-400 mb-6">
            {error || "The order you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-amber-500 text-zinc-950 font-semibold rounded-xl hover:bg-amber-400 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const isPreparing = order.status === "PREPARING";
  const isReadyToPay = order.status === "SERVED" || order.status === "READY_TO_SERVE";
  const isPaid = order.status === "PAID";

  return (
    <div className="min-h-screen bg-zinc-950 pb-28">
      <div className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition-colors touch-manipulation"
            aria-label="Go back"
          >
            <svg className="h-6 w-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-zinc-100 truncate">Order Tracking</h1>
            <p className="text-xs text-zinc-500 truncate">{order.restaurant.name}</p>
          </div>
          <button
            onClick={() => fetchOrder()}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors touch-manipulation"
            aria-label="Refresh order status"
          >
            <RefreshCcw className="h-5 w-5 text-zinc-400" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className={`p-5 rounded-full ${
                isPreparing ? "bg-orange-500/20 border-2 border-orange-400/40" : isReadyToPay ? "bg-emerald-500/20 border-2 border-emerald-400/40" : isPaid ? "bg-violet-500/20 border-2 border-violet-400/40" : "bg-white/10 border-2 border-white/10"
              }`}
            >
              {isPreparing ? (
                <ChefHat className="h-8 w-8 text-orange-400 animate-pulse" />
              ) : isReadyToPay ? (
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              ) : isPaid ? (
                <CreditCard className="h-8 w-8 text-violet-400" />
              ) : (
                <StatusIcon className="h-8 w-8 text-zinc-400" />
              )}
            </div>

            <div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-semibold text-sm ${statusConfig.color}`}>
                <StatusIcon className="h-4 w-4" />
                {statusConfig.label}
              </div>
            </div>

            <div className="flex items-center gap-2 text-zinc-500">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">{formatTime(timeElapsed)} ago</span>
            </div>

            <div className="pt-2 border-t border-white/10 w-full">
              <p className="text-xs text-zinc-500 mb-1">Order ID</p>
              <p className="text-sm font-mono font-semibold text-zinc-200">{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-zinc-100">Order Details</h2>
          <div className="space-y-2">
            {order.table && (
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-sm text-zinc-500">Table</span>
                <span className="text-sm font-semibold text-zinc-200">{order.table.name || `Table ${order.table.id.slice(-4)}`}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-sm text-zinc-500">Type</span>
              <span className="text-sm font-semibold text-zinc-200">
                {order.type === "DINE_IN" ? "Dine In" : order.type === "TAKEAWAY" ? "Takeaway" : order.type}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-zinc-500">Placed</span>
              <span className="text-sm font-semibold text-zinc-200">{new Date(order.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">Items</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-white/10 last:border-0 last:pb-0">
                {item.menuItem.image && (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                    <Image
                      src={getCloudinaryThumbnail(item.menuItem.image, { width: 128, height: 128 })}
                      alt={item.menuItem.name || "Order item"}
                      fill
                      className="object-cover"
                      sizes="64px"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-100">{item.menuItem.name}</h3>
                      {item.menuItem.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.menuItem.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-amber-400">₹{(item.price * item.quantity).toFixed(2)}</p>
                      <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-zinc-100">Total</span>
              <span className="text-2xl font-bold text-amber-400">₹{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">Status Timeline</h2>
          <div className="space-y-4">
            {[
              { status: "PENDING", label: "Order Received" },
              { status: "ACCEPTED", label: "Order Accepted" },
              { status: "PREPARING", label: "Preparing Food" },
              { status: "SERVED", label: "Ready to Serve" },
              { status: "PAID", label: "Payment Complete" },
            ].map((step, index) => {
              const statusOrder = ["PENDING", "ACCEPTED", "PREPARING", "SERVED", "PAID"];
              const currentIndex = statusOrder.indexOf(order.status);
              const stepIndex = statusOrder.indexOf(step.status);
              const isCompleted = stepIndex <= currentIndex;
              const isCurrent = stepIndex === currentIndex;

              return (
                <div key={step.status} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                        isCompleted ? (isCurrent ? "bg-amber-500 border-amber-500" : "bg-emerald-500 border-emerald-500") : "bg-white/10 border-white/20"
                      }`}
                    >
                      {isCompleted && <CheckCircle className="h-5 w-5 text-white" />}
                    </div>
                    {index < 4 && <div className={`w-0.5 h-12 ${isCompleted ? "bg-emerald-500" : "bg-white/10"}`} />}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`font-semibold ${isCompleted ? "text-zinc-100" : "text-zinc-500"}`}>{step.label}</p>
                    {isCurrent && (
                      <p className="text-xs text-zinc-500 mt-1">
                        {isPreparing ? "Cooking in progress..." : isReadyToPay ? "Tap Pay Now below" : isPaid ? "Thank you!" : "In progress"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!isReadyToPay && !isPaid && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 py-4 px-6 z-20 safe-area-inset-bottom">
          <div className="max-w-md mx-auto flex items-center justify-center gap-3">
            {isPreparing ? (
              <>
                <ChefHat className="h-5 w-5 text-amber-400 animate-pulse" />
                <p className="font-semibold text-zinc-100 text-center">Your food is being prepared 🍳</p>
              </>
            ) : (
              <>
                <UtensilsCrossed className="h-5 w-5 text-amber-400" />
                <p className="font-semibold text-zinc-100 text-center">{statusConfig.message}</p>
              </>
            )}
          </div>
        </div>
      )}

      {isReadyToPay && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 py-4 px-6 z-20 safe-area-inset-bottom">
          <div className="max-w-md mx-auto space-y-3">
            <p className="font-semibold text-zinc-100 text-center">{statusConfig.message}</p>
            {payError && (
              <p className="text-sm text-red-400 text-center">{payError}</p>
            )}
            <button
              type="button"
              onClick={handlePayAtCounter}
              disabled={payAtCounterLoading}
              className="w-full py-4 bg-emerald-500 text-white font-bold text-lg rounded-xl hover:bg-emerald-400 active:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors touch-manipulation shadow-lg shadow-emerald-900/20"
            >
              {payAtCounterLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Placing order...
                </>
              ) : (
                <>
                  <Banknote className="h-5 w-5" />
                  Pay at Counter / Cash
                </>
              )}
            </button>
            <CustomerPayButton
              orderId={orderId}
              amount={order.bill?.balance ?? order.total}
              onSuccess={() => setPayError(null)}
              onError={(msg) => setPayError(msg)}
              className="w-full py-3 bg-amber-500 text-zinc-950 font-bold rounded-xl hover:bg-amber-400 active:bg-amber-300 flex items-center justify-center gap-2"
            >
              Pay ₹{(order.bill?.balance ?? order.total).toFixed(2)} Now (Online)
            </CustomerPayButton>
          </div>
        </div>
      )}

      {isPaid && (
        <div className="fixed bottom-0 left-0 right-0 bg-violet-500/20 backdrop-blur-xl border-t border-violet-400/30 py-6 px-6 z-20 safe-area-inset-bottom">
          <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-2">
            <CreditCard className="h-8 w-8 text-violet-400" />
            <p className="font-bold text-zinc-100 text-center text-lg">
              {payAtCounter ? "Order Placed! Please pay at the counter." : "Payment Successful"}
            </p>
            <p className="text-sm text-zinc-400 text-center">
              {payAtCounter ? "Head to the counter to complete your payment." : "Thank you for dining with us!"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
