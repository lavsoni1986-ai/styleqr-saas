"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Clock, Utensils, CheckCircle, ChefHat, AlertCircle, RefreshCw } from "lucide-react";

// Detect test mode for faster E2E tests
const isTestMode = typeof window !== 'undefined' && (
  window.location.search.includes('test=true') ||
  process.env.NODE_ENV === 'test'
);

interface KitchenOrder {
  id: string;
  status: "PENDING" | "ACCEPTED" | "PREPARING" | "SERVED" | "CANCELLED";
  type: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  total: number;
  isPriority: boolean;
  notes: string | null;
  tableName: string;
  tableId: string | null;
  contextDisplay: string | null; // ContextNode: Display string for context-aware orders
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    image?: string | null;
  }>;
  createdAt: string;
  timeElapsed: number;
}

interface KitchenDisplayProps {
  restaurantId: string;
  restaurantName: string;
}

export default function KitchenDisplay({ restaurantId, restaurantName }: KitchenDisplayProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio for new order alerts
  useEffect(() => {
    // Create audio context for notification sound
    if (typeof window !== "undefined" && "Audio" in window) {
      audioRef.current = new Audio();
      // Use a simple beep sound (can be replaced with actual sound file)
      audioRef.current.volume = 0.5;
    }
  }, []);

  // Play sound alert for new orders
  const playAlert = useCallback(() => {
    if (audioRef.current) {
      try {
        // Create a simple beep using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (err) {
        console.warn("Could not play alert sound:", err);
      }
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/kitchen/orders", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = result?.error || `Failed to load orders (${response.status})`;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (result && result.orders && Array.isArray(result.orders)) {
        const newOrders = result.orders as KitchenOrder[];

        // Check for new orders
        const currentOrderIds = new Set(newOrders.map((o) => o.id));
        const previousOrderIds = previousOrderIdsRef.current;

        // Find new orders (orders that weren't in previous fetch)
        const newOrderIds = newOrders
          .filter((o) => !previousOrderIds.has(o.id))
          .map((o) => o.id);

        // Play alert if there are new orders
        if (newOrderIds.length > 0 && previousOrderIds.size > 0) {
          playAlert();
        }

        // Update previous order IDs
        previousOrderIdsRef.current = currentOrderIds;

        setOrders(newOrders);
        setError(null);
        setLastUpdateTime(new Date());
      } else {
        setOrders([]);
        setError("Invalid response format");
      }

      setLoading(false);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  }, [playAlert]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh - skip in test mode to avoid timeouts
  useEffect(() => {
    if (isTestMode) return;
    
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: KitchenOrder["status"]) => {
    setUpdatingStatus((prev) => new Set(prev).add(orderId));

    try {
      const response = await fetch(`/api/kitchen/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = result?.error || `Failed to update order (${response.status})`;
        alert(errorMessage);
        return;
      }

      // Refresh orders after successful update
      await fetchOrders();
    } catch (err) {
      console.error("Update order status error:", err);
      alert("Network error. Please try again.");
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  // Format time elapsed
  const formatTimeElapsed = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Get status color
  const getStatusColor = (status: KitchenOrder["status"]) => {
    switch (status) {
      case "PENDING":
        return "bg-red-500";
      case "ACCEPTED":
        return "bg-yellow-500";
      case "PREPARING":
        return "bg-blue-500";
      case "SERVED":
        return "bg-green-500";
      case "CANCELLED":
        return "bg-slate-500";
      default:
        return "bg-slate-500";
    }
  };

  // Get status label
  const getStatusLabel = (status: KitchenOrder["status"]) => {
    switch (status) {
      case "PENDING":
        return "New Order";
      case "ACCEPTED":
        return "Accepted";
      case "PREPARING":
        return "Cooking";
      case "SERVED":
        return "Ready";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };

  // Get next status action
  const getNextStatus = (currentStatus: KitchenOrder["status"]): KitchenOrder["status"] | null => {
    switch (currentStatus) {
      case "PENDING":
        return "ACCEPTED";
      case "ACCEPTED":
        return "PREPARING";
      case "PREPARING":
        return "SERVED";
      default:
        return null;
    }
  };

  // Group orders by status
  const ordersByStatus = {
    PENDING: orders.filter((o) => o.status === "PENDING"),
    ACCEPTED: orders.filter((o) => o.status === "ACCEPTED"),
    PREPARING: orders.filter((o) => o.status === "PREPARING"),
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-xl">Loading kitchen orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{restaurantName} Kitchen</h1>
              <p className="text-slate-400 text-sm mt-1">
                Last updated: {lastUpdateTime.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              aria-label="Refresh orders"
            >
              <RefreshCw className="h-5 w-5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Orders Grid */}
      <div data-testid="kitchen-orders" className="max-w-7xl mx-auto px-6 py-6">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Utensils className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl text-slate-400">No orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* PENDING Orders */}
            {ordersByStatus.PENDING.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={updateOrderStatus}
                updating={updatingStatus.has(order.id)}
                formatTimeElapsed={formatTimeElapsed}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getNextStatus={getNextStatus}
              />
            ))}

            {/* ACCEPTED Orders */}
            {ordersByStatus.ACCEPTED.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={updateOrderStatus}
                updating={updatingStatus.has(order.id)}
                formatTimeElapsed={formatTimeElapsed}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getNextStatus={getNextStatus}
              />
            ))}

            {/* PREPARING Orders */}
            {ordersByStatus.PREPARING.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={updateOrderStatus}
                updating={updatingStatus.has(order.id)}
                formatTimeElapsed={formatTimeElapsed}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getNextStatus={getNextStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Order Card Component
interface OrderCardProps {
  order: KitchenOrder;
  onStatusUpdate: (orderId: string, status: KitchenOrder["status"]) => void;
  updating: boolean;
  formatTimeElapsed: (seconds: number) => string;
  getStatusColor: (status: KitchenOrder["status"]) => string;
  getStatusLabel: (status: KitchenOrder["status"]) => string;
  getNextStatus: (status: KitchenOrder["status"]) => KitchenOrder["status"] | null;
}

function OrderCard({
  order,
  onStatusUpdate,
  updating,
  formatTimeElapsed,
  getStatusColor,
  getStatusLabel,
  getNextStatus,
}: OrderCardProps) {
  const nextStatus = getNextStatus(order.status);

  return (
    <div className="bg-slate-800 rounded-2xl border-2 border-slate-700 p-6 hover:border-orange-500 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
            {order.isPriority && (
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-600 text-white animate-pulse">
                ⚡ PRIORITY
              </span>
            )}
          </div>
          {/* ContextNode: Display context for hotel/restaurant scenarios - visually dominant */}
          {order.contextDisplay ? (
            <h3 className="text-2xl font-bold text-blue-300">{order.contextDisplay}</h3>
          ) : (
            <h3 className="text-2xl font-bold text-white">{order.tableName}</h3>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-orange-400 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-semibold">{formatTimeElapsed(order.timeElapsed)}</span>
          </div>
          <p className="text-xl font-bold text-white">${order.total.toFixed(2)}</p>
        </div>
      </div>

      {/* Notes Section */}
      {order.notes && (
        <div className="mb-4 p-4 bg-yellow-900/30 border-2 border-yellow-600/50 rounded-xl">
          <div className="flex items-start gap-2">
            <Utensils className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-yellow-100 text-sm whitespace-pre-wrap break-words">{order.notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2 mb-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {item.image && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{item.name}</p>
                <p className="text-xs text-slate-400">${item.price.toFixed(2)} each</p>
              </div>
            </div>
            <div className="flex-shrink-0 ml-3">
              <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                ×{item.quantity}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      {nextStatus && (
        <button
          data-testid={nextStatus === "ACCEPTED" ? "accept-order" : nextStatus === "PREPARING" ? "status-preparing" : "status-served"}
          onClick={() => onStatusUpdate(order.id, nextStatus)}
          disabled={updating}
          className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {updating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Updating...</span>
            </>
          ) : (
            <>
              {nextStatus === "ACCEPTED" && <CheckCircle className="h-5 w-5" />}
              {nextStatus === "PREPARING" && <ChefHat className="h-5 w-5" />}
              {nextStatus === "SERVED" && <CheckCircle className="h-5 w-5" />}
              <span>
                {nextStatus === "ACCEPTED" && "Accept"}
                {nextStatus === "PREPARING" && "Start"}
                {nextStatus === "SERVED" && "Ready"}
              </span>
            </>
          )}
        </button>
      )}

      {order.status === "SERVED" && (
        <div className="w-full py-3 bg-green-600 text-white font-bold text-center rounded-xl">
          ✓ Ready
        </div>
      )}
    </div>
  );
}
