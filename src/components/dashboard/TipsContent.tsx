"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, DollarSign, Users, TrendingUp } from "lucide-react";

interface Tip {
  id: string;
  amount: number;
  percentage?: number;
  staffName?: string;
  staffId?: string;
  billNumber: string;
  paymentMethod: string;
  createdAt: string;
  notes?: string;
}

interface TipsContentProps {
  restaurantId: string;
  restaurantName: string;
}

export default function TipsContent({ restaurantId, restaurantName }: TipsContentProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  const fetchTips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/tip?startDate=${dateFilter}&endDate=${dateFilter}`);
      const data = await res.json();

      if (res.ok && data.tips) {
        setTips(
          data.tips.map((tip: any) => ({
            id: tip.id,
            amount: tip.amount,
            percentage: tip.percentage,
            staffName: tip.staff?.name,
            staffId: tip.staffId,
            billNumber: tip.bill?.billNumber || "—",
            paymentMethod: tip.payment?.method || "—",
            createdAt: tip.createdAt,
            notes: tip.notes,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch tips:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const totalTips = tips.reduce((sum, tip) => sum + tip.amount, 0);
  const byStaff = tips.reduce((acc, tip) => {
    const staffId = tip.staffId || "unassigned";
    const staffName = tip.staffName || "Unassigned";
    if (!acc[staffId]) {
      acc[staffId] = { name: staffName, total: 0, count: 0 };
    }
    acc[staffId].total += tip.amount;
    acc[staffId].count += 1;
    return acc;
  }, {} as Record<string, { name: string; total: number; count: number }>);

  return (
    <div data-testid="tips" className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tips & Gratuity</h1>
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
            onClick={fetchTips}
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
            <span className="text-slate-600 text-sm">Total Tips</span>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{totalTips.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">{tips.length} tips</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Average Tip</span>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ₹{tips.length > 0 ? (totalTips / tips.length).toFixed(2) : "0.00"}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Staff Members</span>
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{Object.keys(byStaff).length}</p>
        </div>
      </div>

      {/* Staff Breakdown */}
      {Object.keys(byStaff).length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Tips by Staff</h2>
          <div className="space-y-3">
            {Object.entries(byStaff)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([staffId, data]) => (
                <div key={staffId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900">{data.name}</p>
                    <p className="text-sm text-slate-600">{data.count} tips</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">₹{data.total.toFixed(2)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tips List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Bill</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Staff</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Percentage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                    <p className="mt-2">Loading tips...</p>
                  </td>
                </tr>
              ) : tips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <div data-testid="empty-state">No tips found for selected date</div>
                  </td>
                </tr>
              ) : (
                tips.map((tip) => (
                  <tr key={tip.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {new Date(tip.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{tip.billNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{tip.staffName || "Unassigned"}</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">₹{tip.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {tip.percentage ? `${tip.percentage}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{tip.paymentMethod}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
