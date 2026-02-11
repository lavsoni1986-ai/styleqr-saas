"use client";

interface Reseller {
  id: string;
  name: string;
  email: string;
  commissionRate: number;
  districts: Array<{
    id: string;
    name: string;
    code: string;
    planType: string;
    subscriptionStatus: string;
    createdAt: Date;
  }>;
}

interface RevenueSummary {
  totalEarned: number;
  pendingPayouts: number;
  paidPayouts: number;
}

interface MonthlyBreakdown {
  month: string;
  total: number;
  pending: number;
  paid: number;
}

interface ResellerDashboardContentProps {
  reseller: Reseller;
  revenueSummary: RevenueSummary;
  monthlyBreakdown: MonthlyBreakdown[];
}

export default function ResellerDashboardContent({
  reseller,
  revenueSummary,
  monthlyBreakdown,
}: ResellerDashboardContentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reseller Dashboard</h1>
        <p className="text-slate-600">
          Welcome, {reseller.name} • Commission Rate: {(reseller.commissionRate * 100).toFixed(1)}%
        </p>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600 mb-2">Total Earned</p>
          <p className="text-3xl font-bold text-slate-900">{formatCurrency(revenueSummary.totalEarned)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600 mb-2">Pending Payouts</p>
          <p className="text-3xl font-bold text-yellow-600">{formatCurrency(revenueSummary.pendingPayouts)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600 mb-2">Paid Payouts</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(revenueSummary.paidPayouts)}</p>
        </div>
      </div>

      {/* Monthly Revenue Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Monthly Revenue Breakdown</h2>
        </div>
        <div className="p-6">
          {monthlyBreakdown.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No revenue data available</p>
          ) : (
            <div className="space-y-4">
              {monthlyBreakdown.map((month, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{month.month}</p>
                    <p className="text-sm text-slate-600">
                      Pending: {formatCurrency(month.pending)} • Paid: {formatCurrency(month.paid)}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(month.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Districts List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Your Districts ({reseller.districts.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  District
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reseller.districts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No districts assigned
                  </td>
                </tr>
              ) : (
                reseller.districts.map((district) => (
                  <tr key={district.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{district.name}</div>
                        <div className="text-sm text-slate-500">{district.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {district.planType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          district.subscriptionStatus === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : district.subscriptionStatus === "SUSPENDED"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {district.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(district.createdAt)}
                    </td>
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

