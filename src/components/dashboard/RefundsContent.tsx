"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Filter, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { RefundStatus } from "@prisma/client";

interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  status: RefundStatus;
  reason?: string;
  gatewayRefundId?: string;
  billNumber: string;
  paymentMethod: string;
  paymentAmount: number;
  createdAt: string;
  succeededAt?: string;
  failedAt?: string;
}

interface RefundsContentProps {
  restaurantId: string;
  restaurantName: string;
}

export default function RefundsContent({ restaurantId, restaurantName }: RefundsContentProps) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState<RefundStatus | "ALL">("ALL");

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: dateFilter });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/refunds?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRefunds(data.refunds || []);
      } else {
        setRefunds([]);
      }
    } catch (error) {
      console.error("Failed to fetch refunds:", error);
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const statusColors: Record<RefundStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    SUCCEEDED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-slate-100 text-slate-800",
  };

  const statusIcons: Record<RefundStatus, typeof CheckCircle> = {
    PENDING: Clock,
    PROCESSING: RefreshCw,
    SUCCEEDED: CheckCircle,
    FAILED: XCircle,
    CANCELLED: XCircle,
  };

  const totalRefunded = refunds
    .filter((r) => r.status === "SUCCEEDED")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div data-testid="refunds" className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Refunds</h1>
          <p className="text-slate-600 mt-1">{restaurantName}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <button
            onClick={fetchRefunds}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Total Refunds</span>
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{totalRefunded.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {refunds.filter((r) => r.status === "SUCCEEDED").length} succeeded
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Pending</span>
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {refunds.filter((r) => r.status === "PENDING").length}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Failed</span>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {refunds.filter((r) => r.status === "FAILED").length}
          </p>
        </div>
      </div>

      {/* Refunds List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Bill</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                    <p className="mt-2">Loading refunds...</p>
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <div data-testid="empty-state">No refunds found for selected filters</div>
                  </td>
                </tr>
              ) : (
                refunds.map((refund) => {
                  const StatusIcon = statusIcons[refund.status] || AlertCircle;
                  return (
                    <tr key={refund.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{refund.billNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div>
                          <span>{refund.paymentMethod}</span>
                          <span className="text-slate-400 ml-2">₹{refund.paymentAmount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">-₹{refund.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1 w-fit ${statusColors[refund.status] || "bg-slate-100 text-slate-800"}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {refund.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{refund.reason || "—"}</td>
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
