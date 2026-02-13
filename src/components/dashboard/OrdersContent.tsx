"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCcw,
  Trash2,
  Ban,
  CreditCard,
  X,
} from "lucide-react";
import CashfreeButton from "./CashfreeButton";

interface OrdersContentProps {
  restaurantId: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  type: string;
  createdAt: string;
  table?: { name: string | null } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    menuItem: {
      id: string;
      name: string;
    };
  }>;
}

export default function OrdersContent({ restaurantId }: OrdersContentProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [checkoutOrder, setCheckoutOrder] = useState<{
    orderId: string;
    bill: { id: string; billNumber: string; total: number; paidAmount: number; balance: number };
  } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to load orders");
        setOrders([]);
        return;
      }
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const isTest =
      typeof window !== "undefined" &&
      (window.location.search.includes("test=true") || process.env.NODE_ENV === "test");
    if (!isTest) {
      const interval = setInterval(fetchOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating((prev) => new Set(prev).add(orderId));
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data as any)?.error || "Failed to update order");
        return;
      }

      await fetchOrders();
    } catch (err) {
      setError("Failed to update order");
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    setUpdating((prev) => new Set(prev).add(orderId));
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data as any)?.error || "Failed to cancel order");
        return;
      }

      await fetchOrders();
    } catch (err) {
      setError("Failed to cancel order");
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }

    setUpdating((prev) => new Set(prev).add(orderId));
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data as any)?.error || "Failed to delete order");
        return;
      }

      await fetchOrders();
    } catch (err) {
      setError("Failed to delete order");
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-amber-500/20 text-amber-300 border border-amber-400/30",
      ACCEPTED: "bg-blue-500/20 text-blue-300 border border-blue-400/30",
      PREPARING: "bg-orange-500/20 text-orange-300 border border-orange-400/30",
      SERVED: "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30",
      PAID: "bg-violet-500/20 text-violet-300 border border-violet-400/30",
      CANCELLED: "bg-red-500/20 text-red-300 border border-red-400/30",
    };
    return styles[status as keyof typeof styles] || "bg-white/10 text-zinc-300 border border-white/10";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "ACCEPTED":
      case "PREPARING":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "SERVED":
        return <CheckCircle className="h-4 w-4" />;
      case "PAID":
        return <CreditCard className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleCheckout = async (orderId: string) => {
    setUpdating((prev) => new Set(prev).add(orderId));
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/generate-bill`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to generate bill");
        return;
      }
      setCheckoutOrder({
        orderId,
        bill: data.bill,
      });
    } catch (err) {
      setError("Failed to generate bill");
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
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

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">Orders</h1>
            <p className="text-zinc-400 mt-1">Manage and track restaurant orders</p>
          </div>
          <button
            onClick={fetchOrders}
            className="btn-secondary-admin px-4 py-2 flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      {orders.length === 0 ? (
        <div className="card-glass p-12 text-center" data-testid="empty-state">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <ClipboardList className="h-8 w-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">No orders yet</h2>
          <p className="text-zinc-400">Orders will appear here when customers place them.</p>
        </div>
      ) : (
        <div data-testid="orders-list" className="space-y-4">
          {orders.map((order) => {
            const nextStatus = getNextStatus(order.status);
            return (
              <div key={order.id} data-testid="order-card" className="card-glass p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono text-sm text-zinc-500">#{order.id.slice(-8)}</span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                      <span className="text-xs text-zinc-500">{order.type}</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {order.table?.name || "No table"} • {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-zinc-100">₹{order.total.toFixed(2)}</p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 mb-4">
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-zinc-300">
                          {item.quantity}x {item.menuItem.name}
                        </span>
                        <span className="text-zinc-400">₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  {nextStatus && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, nextStatus)}
                      disabled={updating.has(order.id)}
                      data-testid={nextStatus === "ACCEPTED" ? "accept-order" : nextStatus === "PREPARING" ? "status-preparing" : nextStatus === "SERVED" ? "status-served" : undefined}
                      className="flex-1 px-4 py-2 btn-primary-admin disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updating.has(order.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        `Mark as ${nextStatus}`
                      )}
                    </button>
                  )}
                  
                  {(order.status === "PENDING" || order.status === "ACCEPTED") && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={updating.has(order.id)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 font-semibold rounded-xl border border-red-400/30 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updating.has(order.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Ban className="h-4 w-4" />
                          Cancel
                        </>
                      )}
                    </button>
                  )}

                  {order.status === "PAID" && (
                    <button
                      onClick={() => handleDelete(order.id)}
                      disabled={updating.has(order.id)}
                      className="px-4 py-2 btn-secondary-admin disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updating.has(order.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </>
                      )}
                    </button>
                  )}

                  {order.status === "SERVED" && (
                    <>
                      <button
                        onClick={() => handleCheckout(order.id)}
                        disabled={updating.has(order.id)}
                        data-testid="checkout-order"
                        className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {updating.has(order.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Checkout
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        disabled={updating.has(order.id)}
                        className="px-4 py-2 btn-secondary-admin disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {updating.has(order.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Checkout</h2>
              <button
                onClick={() => setCheckoutOrder(null)}
                className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-zinc-400 text-sm">
                Bill #{checkoutOrder.bill.billNumber} • Balance: ₹
                {checkoutOrder.bill.balance.toFixed(2)}
              </p>
              <CashfreeButton
                billId={checkoutOrder.bill.id}
                amount={checkoutOrder.bill.balance}
                orderId={checkoutOrder.orderId}
                returnUrl={typeof window !== "undefined" ? `${window.location.origin}/dashboard/orders` : undefined}
                onSuccess={() => {
                  setCheckoutOrder(null);
                  fetchOrders();
                }}
                onError={(msg) => setError(msg)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
