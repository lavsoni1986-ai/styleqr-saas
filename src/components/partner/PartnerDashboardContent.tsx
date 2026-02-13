"use client";

import { Building2, DollarSign, TrendingUp, Clock } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  email: string;
  commissionRate: number;
  district: {
    name: string;
    code: string;
  };
}

interface Stats {
  restaurants: number;
  totalCommissions: number;
  totalCommissionCount: number;
  paidCommissions: number;
  paidCommissionCount: number;
  pendingCommissions: number;
  pendingCommissionCount: number;
  commissionRate: number;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  monthlyPrice: number;
  restaurant: {
    id: string;
    name: string;
  } | null;
}

interface Commission {
  id: string;
  amount: number;
  status: string;
  createdAt: Date;
  order: {
    id: string;
    total: number;
  } | null;
  restaurant: {
    id: string;
    name: string;
  } | null;
}

interface PartnerDashboardContentProps {
  partner: Partner;
  stats: Stats;
  subscriptions: Subscription[];
  recentCommissions: Commission[];
}

export default function PartnerDashboardContent({
  partner,
  stats,
  subscriptions,
  recentCommissions,
}: PartnerDashboardContentProps) {
  const statCards = [
    {
      title: "Restaurants",
      value: stats.restaurants,
      icon: Building2,
      color: "bg-orange-500",
    },
    {
      title: "Total Commissions",
      value: `₹${stats.totalCommissions.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-emerald-500",
      subtitle: `${stats.totalCommissionCount} records`,
    },
    {
      title: "Paid Commissions",
      value: `₹${stats.paidCommissions.toFixed(2)}`,
      icon: TrendingUp,
      color: "bg-green-500",
      subtitle: `${stats.paidCommissionCount} records`,
    },
    {
      title: "Pending Commissions",
      value: `₹${stats.pendingCommissions.toFixed(2)}`,
      icon: Clock,
      color: "bg-amber-500",
      subtitle: `${stats.pendingCommissionCount} records`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{partner.name}</h1>
        <p className="text-slate-600 mt-1">
          {partner.district.name} • Commission Rate: {partner.commissionRate}%
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Commissions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Recent Commissions</h2>
        </div>
        <div className="p-6">
          {recentCommissions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No commissions yet</p>
          ) : (
            <div className="space-y-4">
              {recentCommissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {commission.restaurant?.name || "Unknown Restaurant"}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Order: {commission.order?.id.slice(-8) || "N/A"} • 
                      Order Total: ₹{commission.order?.total.toFixed(2) || "0.00"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(commission.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      ₹{commission.amount.toFixed(2)}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-1 ${
                        commission.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : commission.status === "CALCULATED"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {commission.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Active Subscriptions</h2>
        </div>
        <div className="p-6">
          {subscriptions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No active subscriptions</p>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {subscription.restaurant?.name || "Unknown Restaurant"}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Plan: {subscription.plan} • Status: {subscription.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      ${subscription.monthlyPrice.toFixed(2)}/mo
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
