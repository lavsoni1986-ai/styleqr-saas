"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Download, Calendar, Loader2, TrendingUp, DollarSign } from "lucide-react";

interface ReportsContentProps {
  restaurantId: string;
  restaurantName: string;
}

interface DailySalesReport {
  date: string;
  totalBills: number;
  totalSales: number;
  totalSubtotal: number;
  totalTax: number;
  totalDiscount: number;
  totalServiceCharge: number;
  paymentBreakdown: {
    CASH: number;
    UPI: number;
    CARD: number;
    QR: number;
    WALLET?: number;
    NETBANKING?: number;
    EMI?: number;
    CREDIT?: number;
  };
}

export default function ReportsContent({ restaurantId, restaurantName }: ReportsContentProps) {
  const [report, setReport] = useState<DailySalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/daily-sales?date=${selectedDate}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to load report");
        setReport(null);
        return;
      }
      setReport(data);
    } catch (err) {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportCSV = () => {
    if (!report) return;

    const csv = [
      ["Date", "Total Bills", "Total Sales", "Subtotal", "Tax", "Discount", "Service Charge", "Cash", "UPI", "Card", "QR"],
      [
        report.date,
        report.totalBills.toString(),
        report.totalSales.toFixed(2),
        report.totalSubtotal.toFixed(2),
        report.totalTax.toFixed(2),
        report.totalDiscount.toFixed(2),
        report.totalServiceCharge.toFixed(2),
        report.paymentBreakdown.CASH.toFixed(2),
        report.paymentBreakdown.UPI.toFixed(2),
        report.paymentBreakdown.CARD.toFixed(2),
        report.paymentBreakdown.QR.toFixed(2),
      ],
    ].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${report.date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !report) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">Reports</h1>
          <p className="text-zinc-400 mt-1">Sales and analytics</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
          />
          {report && (
            <button
              onClick={exportCSV}
              className="btn-secondary-admin px-4 py-2 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {report && (
        <div data-testid="sales-report" className="space-y-6">
          {/* Summary Cards */}
          <div data-testid="daily-sales" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-glass p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Total Sales</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-1">₹{report.totalSales.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/20">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </div>
            <div className="card-glass p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Total Bills</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-1">{report.totalBills}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-400/20">
                  <BarChart3 className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="card-glass p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Tax Collected</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-1">₹{report.totalTax.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/20">
                  <TrendingUp className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </div>
            <div className="card-glass p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Avg Bill Value</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-1">
                    ₹{report.totalBills > 0 ? (report.totalSales / report.totalBills).toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-400/20">
                  <Calendar className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-glass p-6">
              <h2 className="text-lg font-bold text-zinc-100 mb-4">Sales Breakdown</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Subtotal:</span>
                  <span className="font-semibold text-zinc-200">₹{report.totalSubtotal.toFixed(2)}</span>
                </div>
                {report.totalDiscount > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Discount:</span>
                    <span>-₹{report.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                {report.totalServiceCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Service Charge:</span>
                    <span className="text-zinc-200">₹{report.totalServiceCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Tax (GST):</span>
                  <span className="font-semibold text-zinc-200">₹{report.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-white/10">
                  <span className="text-lg font-bold text-zinc-100">Total:</span>
                  <span className="text-lg font-bold text-amber-400">₹{report.totalSales.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div data-testid="payment-breakdown" className="card-glass p-6">
              <h2 className="text-lg font-bold text-zinc-100 mb-4">Payment Methods</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Cash:</span>
                  <span className="font-semibold text-zinc-200">₹{report.paymentBreakdown.CASH.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">UPI:</span>
                  <span className="font-semibold text-zinc-200">₹{report.paymentBreakdown.UPI.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Card:</span>
                  <span className="font-semibold text-zinc-200">₹{report.paymentBreakdown.CARD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">QR:</span>
                  <span className="font-semibold text-zinc-200">₹{report.paymentBreakdown.QR.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <div className="flex justify-between">
                    <span className="font-semibold text-zinc-100">Total:</span>
                    <span className="font-bold text-amber-400">
                      ₹{(
                        report.paymentBreakdown.CASH +
                        report.paymentBreakdown.UPI +
                        report.paymentBreakdown.CARD +
                        report.paymentBreakdown.QR
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
