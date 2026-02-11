"use client";

import { useState } from "react";

interface ResellerRevenueData {
  id: string;
  name: string;
  email: string;
  commissionRate: number;
  districtCount: number;
  totalRevenue: number;
  commissionOwed: number;
  commissionPaid: number;
  monthlyTotals: Array<{ month: string; total: number }>;
  cfVendorId: string | null;
  pendingPayouts: Array<{
    id: string;
    commission: number;
    cfTransferId: string | null;
    createdAt: Date;
  }>;
}

interface RevenueControlTableProps {
  resellers: ResellerRevenueData[];
}

export default function RevenueControlTable({ resellers }: RevenueControlTableProps) {
  const [retrying, setRetrying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRetryPayout = async (revenueShareId: string) => {
    if (retrying) return;

    setRetrying(revenueShareId);
    setError(null);

    try {
      const response = await fetch("/api/platform/payout/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revenueShareId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to retry payout");
      }

      // Reload page to show updated status
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry payout");
      setRetrying(null);
    }
  };

  const maskTransferId = (transferId: string | null) => {
    if (!transferId) return "N/A";
    // Show first 8 and last 4 characters
    return `${transferId.substring(0, 8)}...${transferId.substring(transferId.length - 4)}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Reseller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Districts
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                Commission Rate
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                Total Revenue
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                Commission Owed
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                Commission Paid
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Monthly Totals
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                Stripe Account
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {resellers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                  No resellers found
                </td>
              </tr>
            ) : (
              resellers.map((reseller) => (
                <tr key={reseller.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{reseller.name}</div>
                      <div className="text-sm text-slate-500">{reseller.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {reseller.districtCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      {(reseller.commissionRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(reseller.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-yellow-600">
                    {formatCurrency(reseller.commissionOwed)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                    {formatCurrency(reseller.commissionPaid)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 space-y-1">
                      {reseller.monthlyTotals.length === 0 ? (
                        <span className="text-slate-400">No data</span>
                      ) : (
                        reseller.monthlyTotals.slice(0, 3).map((month, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{month.month}:</span>
                            <span className="font-medium">{formatCurrency(month.total)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {reseller.cfVendorId ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Not Connected
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {reseller.pendingPayouts.length > 0 && reseller.cfVendorId ? (
                      <div className="space-y-2">
                        {reseller.pendingPayouts.slice(0, 2).map((payout) => (
                          <div key={payout.id} className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">
                              {formatCurrency(payout.commission)}
                            </span>
                            <button
                              onClick={() => handleRetryPayout(payout.id)}
                              disabled={retrying === payout.id}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {retrying === payout.id ? "Retrying..." : "Retry"}
                            </button>
                          </div>
                        ))}
                        {reseller.pendingPayouts.length > 2 && (
                          <span className="text-xs text-slate-400">
                            +{reseller.pendingPayouts.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-6 my-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-600">Total Resellers: </span>
              <span className="font-semibold text-slate-900">{resellers.length}</span>
            </div>
            <div>
              <span className="text-slate-600">Total Commission Owed: </span>
              <span className="font-semibold text-yellow-600">
                {formatCurrency(resellers.reduce((sum, r) => sum + r.commissionOwed, 0))}
              </span>
            </div>
            <div>
              <span className="text-slate-600">Total Commission Paid: </span>
              <span className="font-semibold text-green-600">
                {formatCurrency(resellers.reduce((sum, r) => sum + r.commissionPaid, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

