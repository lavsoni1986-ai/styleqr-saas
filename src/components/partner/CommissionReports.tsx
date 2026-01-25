"use client";

import { DollarSign, CheckCircle, Clock, XCircle } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  commissionRate: number;
}

interface Commission {
  id: string;
  amount: number;
  rate: number;
  baseAmount: number;
  status: string;
  paymentDate: Date | null;
  createdAt: Date;
  description: string | null;
  order: {
    id: string;
    total: number;
    createdAt: Date;
    status: string;
  } | null;
  restaurant: {
    id: string;
    name: string;
  } | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

interface CommissionReportsProps {
  commissions: Commission[];
  partner: Partner;
}

export default function CommissionReports({
  commissions,
  partner,
}: CommissionReportsProps) {
  const statusConfig = {
    PENDING: { icon: Clock, color: "bg-amber-100 text-amber-700", label: "Pending" },
    CALCULATED: { icon: CheckCircle, color: "bg-blue-100 text-blue-700", label: "Calculated" },
    PAID: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Paid" },
    CANCELLED: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Cancelled" },
  };

  const totalAmount = commissions.reduce((sum, c) => sum + c.amount, 0);
  const paidAmount = commissions
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + c.amount, 0);
  const pendingAmount = commissions
    .filter((c) => c.status === "PENDING" || c.status === "CALCULATED")
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Commission Reports</h1>
          <p className="text-slate-600 mt-1">
            {partner.name} • {partner.commissionRate}% Commission Rate
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Total Commissions</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                ${totalAmount.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{commissions.length} records</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Paid Commissions</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                ${paidAmount.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {commissions.filter((c) => c.status === "PAID").length} records
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Pending Commissions</p>
              <p className="text-2xl font-bold text-amber-600 mt-2">
                ${pendingAmount.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {commissions.filter((c) => c.status === "PENDING" || c.status === "CALCULATED").length} records
              </p>
            </div>
            <div className="bg-amber-500 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">All Commissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Base Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No commissions yet
                  </td>
                </tr>
              ) : (
                commissions.map((commission) => {
                  const status = statusConfig[commission.status as keyof typeof statusConfig] || statusConfig.PENDING;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={commission.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {commission.restaurant?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {commission.order?.id.slice(-8) || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        ${commission.baseAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {commission.rate}%
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600">
                        ${commission.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${status.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(commission.createdAt).toLocaleDateString()}
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
