"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Filter, Download, TrendingUp, DollarSign, CreditCard, Smartphone, Wallet, QrCode } from "lucide-react";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  billNumber: string;
  tableName?: string;
  createdAt: string;
}

interface PaymentsContentProps {
  restaurantId: string;
  restaurantName: string;
}

export default function PaymentsContent({ restaurantId, restaurantName }: PaymentsContentProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: dateFilter,
        ...(methodFilter !== "ALL" && { method: methodFilter }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
      });

      const res = await fetch(`/api/payments/live-feed?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, methodFilter, statusFilter]);

  useEffect(() => {
    fetchPayments();
    const isTest =
      typeof window !== "undefined" &&
      (window.location.search.includes("test=true") || process.env.NODE_ENV === "test");
    if (!isTest) {
      const interval = setInterval(fetchPayments, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchPayments]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const byMethod = payments.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);

  const methodIcons: Record<PaymentMethod, typeof Wallet> = {
    CASH: Wallet,
    UPI: Smartphone,
    CARD: CreditCard,
    QR: QrCode,
    WALLET: Wallet,
    NETBANKING: CreditCard,
    EMI: CreditCard,
    CREDIT: CreditCard,
  };

  // Fix 5: SUCCESS/SUCCEEDED → Green, PENDING → Yellow, FAILED → Red
  const statusColors: Record<PaymentStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    SUCCEEDED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-slate-100 text-slate-800",
    REFUNDED: "bg-orange-100 text-orange-800",
    PARTIALLY_REFUNDED: "bg-amber-100 text-amber-800",
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    setConfirmingId(paymentId);
    try {
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, status: "SUCCEEDED" as const } : p
          )
        );
      } else {
        console.error("Confirm failed:", data.error);
      }
    } catch (e) {
      console.error("Confirm error:", e);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRefund = async (paymentId: string) => {
    setRefundingId(paymentId);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, status: "REFUNDED" as const } : p))
        );
        setSuccessMessage("Refund successful");
      } else {
        console.error("Refund failed:", data.error);
      }
    } catch (e) {
      console.error("Refund error:", e);
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-600 mt-1">{restaurantName}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Total Today</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{totalAmount.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">{payments.length} transactions</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Cash</span>
            <Wallet className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{(byMethod.CASH || 0).toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Digital</span>
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ₹{((byMethod.UPI || 0) + (byMethod.CARD || 0) + (byMethod.QR || 0)).toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Success Rate</span>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {payments.length > 0
              ? Math.round((payments.filter((p) => p.status === "SUCCEEDED").length / payments.length) * 100)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Method</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | "ALL")}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="QR">QR</option>
              <option value="WALLET">Wallet</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "ALL")}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="SUCCEEDED">Succeeded</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div data-testid="payments-table" className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div data-testid="live-payment-feed" className="overflow-x-auto">
          <table data-testid="payments-list" className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Bill</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                    <p className="mt-2">Loading payments...</p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <div data-testid="empty-state">No payments found for selected filters</div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const MethodIcon = methodIcons[payment.method] || Wallet;
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(payment.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <span className="font-semibold text-slate-900">{payment.billNumber}</span>
                          {payment.tableName && (
                            <span className="text-slate-500 ml-2">({payment.tableName})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MethodIcon className="h-4 w-4 text-slate-600" />
                          <span className="text-sm text-slate-900">{payment.method}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">₹{payment.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[payment.status] || "bg-slate-100 text-slate-800"}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {payment.reference ? payment.reference.slice(-8) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {payment.status === "PENDING" && (
                          <button
                            onClick={() => handleMarkAsPaid(payment.id)}
                            disabled={confirmingId === payment.id}
                            className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {confirmingId === payment.id ? "..." : "Mark as Paid"}
                          </button>
                        )}
                        {payment.status === "SUCCEEDED" && (
                          <button
                            onClick={() => handleRefund(payment.id)}
                            disabled={refundingId === payment.id}
                            className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {refundingId === payment.id ? "..." : "Refund"}
                          </button>
                        )}
                        {payment.status !== "PENDING" && payment.status !== "SUCCEEDED" && "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
