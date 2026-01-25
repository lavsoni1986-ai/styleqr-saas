"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, TrendingUp, DollarSign, AlertCircle, CheckCircle, Download } from "lucide-react";

interface Settlement {
  id: string;
  date: string;
  status: string;
  totalSales: number;
  cash: number;
  upi: number;
  card: number;
  wallet: number;
  qr: number;
  netbanking: number;
  refunds: number;
  tips: number;
  discounts: number;
  gatewayAmount: number;
  gatewayFees: number;
  variance: number;
  varianceNotes?: string;
  transactionCount: number;
  paymentCount: number;
  refundCount: number;
}

interface SettlementsContentProps {
  restaurantId: string;
  restaurantName: string;
}

export default function SettlementsContent({ restaurantId, restaurantName }: SettlementsContentProps) {
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchSettlement = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settlements/daily?date=${date}`);
      const data = await res.json();

      if (res.ok) {
        setSettlement(data);
      }
    } catch (error) {
      console.error("Failed to fetch settlement:", error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchSettlement();
  }, [fetchSettlement]);

  const digitalTotal = (settlement?.upi || 0) + (settlement?.card || 0) + (settlement?.wallet || 0) + (settlement?.qr || 0);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Daily Settlement</h1>
          <p className="text-slate-600 mt-1">{restaurantName}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-slate-600">Loading settlement...</p>
        </div>
      ) : !settlement ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div data-testid="empty-state">
            <p className="text-slate-600">No settlement found for selected date</p>
          </div>
        </div>
      ) : (
        <div data-testid="settlement-table" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm">Total Sales</span>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">₹{settlement.totalSales.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">{settlement.transactionCount} transactions</p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm">Cash</span>
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">₹{settlement.cash.toFixed(2)}</p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm">Digital</span>
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">₹{digitalTotal.toFixed(2)}</p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm">Variance</span>
                {settlement.variance === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
              </div>
              <p className={`text-2xl font-bold ${settlement.variance === 0 ? "text-green-600" : "text-orange-600"}`}>
                ₹{settlement.variance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Cash</p>
                <p className="text-xl font-bold text-slate-900">₹{settlement.cash.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">UPI</p>
                <p className="text-xl font-bold text-slate-900">₹{settlement.upi.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Card</p>
                <p className="text-xl font-bold text-slate-900">₹{settlement.card.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">QR</p>
                <p className="text-xl font-bold text-slate-900">₹{settlement.qr.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Wallet</p>
                <p className="text-xl font-bold text-slate-900">₹{settlement.wallet.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Netbanking</p>
                <p className="text-xl font-bold text-slate-900">₹{settlement.netbanking.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Adjustments */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Adjustments</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Refunds</p>
                <p className="text-xl font-bold text-red-600">-₹{settlement.refunds.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">{settlement.refundCount} refunds</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Tips</p>
                <p className="text-xl font-bold text-green-600">+₹{settlement.tips.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Discounts</p>
                <p className="text-xl font-bold text-orange-600">-₹{settlement.discounts.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Gateway Fees</p>
                <p className="text-xl font-bold text-slate-600">-₹{settlement.gatewayFees.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Gateway Settlement */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Gateway Settlement</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Gateway Amount</p>
                <p className="text-xl font-bold text-slate-900">₹{settlement.gatewayAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Gateway Fees</p>
                <p className="text-xl font-bold text-slate-600">₹{settlement.gatewayFees.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Net Settlement</p>
                <p className="text-xl font-bold text-green-600">
                  ₹{(settlement.gatewayAmount - settlement.gatewayFees).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Variance Notes */}
          {settlement.variance !== 0 && settlement.varianceNotes && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900">Variance Detected</p>
                  <p className="text-sm text-orange-700 mt-1">{settlement.varianceNotes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <p className={`text-lg font-semibold mt-1 ${
                  settlement.status === "RECONCILED" ? "text-green-600" :
                  settlement.status === "PROCESSED" ? "text-blue-600" :
                  "text-yellow-600"
                }`}>
                  {settlement.status}
                </p>
              </div>
              <button
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                onClick={() => {
                  // Export settlement as CSV
                  const csv = [
                    ["Date", "Total Sales", "Cash", "UPI", "Card", "Digital", "Refunds", "Tips", "Variance"],
                    [
                      settlement.date,
                      settlement.totalSales.toFixed(2),
                      settlement.cash.toFixed(2),
                      settlement.upi.toFixed(2),
                      settlement.card.toFixed(2),
                      digitalTotal.toFixed(2),
                      settlement.refunds.toFixed(2),
                      settlement.tips.toFixed(2),
                      settlement.variance.toFixed(2),
                    ],
                  ].map(row => row.join(",")).join("\n");

                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `settlement-${settlement.date}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
