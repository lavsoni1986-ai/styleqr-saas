"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getCloudinaryThumbnail } from "@/lib/cloudinary";
import {
  Clock,
  CheckCircle,
  ChefHat,
  Loader2,
  UtensilsCrossed,
  AlertCircle,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";

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
};

export default function OrderTrackingClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError("Order not found");
        } else {
          setError("Failed to load order");
        }
        setLoading(false);
        return;
      }

      const data = (await response.json()) as OrderData;
      setOrder(data);
      setError(null);

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

  // Auto-refresh every 5 seconds (disable when SERVED)
  useEffect(() => {
    if (loading || error || order?.status === "SERVED") return;

    const interval = setInterval(() => {
      fetchOrder();
    }, 5000);

    return () => clearInterval(interval);
  }, [loading, error, order?.status, fetchOrder]);

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
          message: "Your order is ready! Enjoy your meal 🎉",
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
  const isServed = order.status === "SERVED";

  return (
    <div className="min-h-screen bg-zinc-950 pb-28">
      <div className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition-colors touch-manipulation"
          >
            <svg className="h-6 w-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-zinc-100 truncate">Order Tracking</h1>
            <p className="text-xs text-zinc-500 truncate">{order.restaurant.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className={`p-5 rounded-full ${
                isPreparing ? "bg-orange-500/20 border-2 border-orange-400/40" : isServed ? "bg-emerald-500/20 border-2 border-emerald-400/40" : "bg-white/10 border-2 border-white/10"
              }`}
            >
              {isPreparing ? (
                <ChefHat className="h-8 w-8 text-orange-400 animate-pulse" />
              ) : isServed ? (
                <CheckCircle className="h-8 w-8 text-emerald-400" />
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
            ].map((step, index) => {
              const statusOrder = ["PENDING", "ACCEPTED", "PREPARING", "SERVED"];
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
                    {index < 3 && <div className={`w-0.5 h-12 ${isCompleted ? "bg-emerald-500" : "bg-white/10"}`} />}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`font-semibold ${isCompleted ? "text-zinc-100" : "text-zinc-500"}`}>{step.label}</p>
                    {isCurrent && (
                      <p className="text-xs text-zinc-500 mt-1">
                        {isPreparing ? "Cooking in progress..." : isServed ? "Ready for you!" : "In progress"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!isServed && (
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

      {isServed && (
        <div className="fixed bottom-0 left-0 right-0 bg-emerald-500/20 backdrop-blur-xl border-t border-emerald-400/30 py-4 px-6 z-20 safe-area-inset-bottom">
          <div className="max-w-md mx-auto flex items-center justify-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <p className="font-semibold text-zinc-100 text-center">{statusConfig.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
