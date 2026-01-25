"use client";

import { Users, Building2, ShoppingBag, DollarSign } from "lucide-react";

interface District {
  id: string;
  name: string;
  code: string;
  region?: string | null;
  partners: Array<{
    id: string;
    name: string;
    email: string;
    commissionRate: number;
  }>;
  restaurants: Array<{
    id: string;
    name: string;
    owner: {
      email: string;
      name?: string | null;
    };
  }>;
}

interface Stats {
  partners: number;
  restaurants: number;
  orders: number;
  revenue: number;
}

interface DistrictDashboardContentProps {
  district: District;
  stats: Stats;
}

export default function DistrictDashboardContent({
  district,
  stats,
}: DistrictDashboardContentProps) {
  const statCards = [
    {
      title: "Partners",
      value: stats.partners,
      icon: Users,
      color: "bg-green-500",
    },
    {
      title: "Restaurants",
      value: stats.restaurants,
      icon: Building2,
      color: "bg-orange-500",
    },
    {
      title: "Orders",
      value: stats.orders,
      icon: ShoppingBag,
      color: "bg-purple-500",
    },
    {
      title: "Revenue",
      value: `$${stats.revenue.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{district.name} District</h1>
        <p className="text-slate-600 mt-1">District code: {district.code}</p>
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
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Partners */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Partners</h2>
        </div>
        <div className="p-6">
          {district.partners.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No partners yet</p>
          ) : (
            <div className="space-y-4">
              {district.partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">{partner.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{partner.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {partner.commissionRate}% Commission
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
