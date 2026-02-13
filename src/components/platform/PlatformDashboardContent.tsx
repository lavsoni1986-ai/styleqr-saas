"use client";

import { MapPin, Users, Building2, ShoppingBag, DollarSign } from "lucide-react";

interface Stats {
  districts: number;
  partners: number;
  restaurants: number;
  orders: number;
  revenue: number;
}

interface District {
  id: string;
  name: string;
  code: string;
  region?: string | null;
  createdAt: Date;
  admin: {
    id: string;
    email: string;
    name?: string | null;
  };
  _count: {
    partners: number;
    restaurants: number;
  };
}

interface PlatformDashboardContentProps {
  stats: Stats;
  recentDistricts: District[];
}

export default function PlatformDashboardContent({
  stats,
  recentDistricts,
}: PlatformDashboardContentProps) {
  const statCards = [
    {
      title: "Districts",
      value: stats.districts,
      icon: MapPin,
      color: "bg-blue-500",
    },
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
      value: `₹${stats.revenue.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Platform Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your multi-district SaaS platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

      {/* Recent Districts */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Recent Districts</h2>
        </div>
        <div className="p-6">
          {recentDistricts.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No districts yet</p>
          ) : (
            <div className="space-y-4">
              {recentDistricts.map((district) => (
                <div
                  key={district.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">{district.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Code: {district.code} • Region: {district.region || "N/A"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Admin: {district.admin.name || district.admin.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {district._count.partners} Partners
                    </p>
                    <p className="text-sm text-slate-600">
                      {district._count.restaurants} Restaurants
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
