"use client";

import {
  Building2,
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

interface Stats {
  totalRestaurants: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  newRestaurantsLast30: number;
  restaurantGrowthPct: string;
  ordersOverTime: Array<{ date: string; count: number }>;
}

interface AnalyticsDashboardProps {
  stats: Stats;
}

export default function AnalyticsDashboard({ stats }: AnalyticsDashboardProps) {
  const maxOrders = Math.max(
    ...stats.ordersOverTime.map((d) => d.count),
    1
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-zinc-400 mt-1">
          Platform performance and growth metrics
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                ₹{stats.totalRevenue.toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total Orders
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.totalOrders.toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total Restaurants
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.totalRestaurants.toLocaleString()}
              </p>
              <p className="text-sm text-amber-500 mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                +{stats.newRestaurantsLast30} in 30d ({stats.restaurantGrowthPct}
                %)
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total Users
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.totalUsers.toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Over Time - Simple Bar Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-amber-500 shrink-0" />
          Orders Over Time (Last 30 Days)
        </h2>
        <div className="h-48 flex items-end gap-1 min-w-[280px]">
          {stats.ordersOverTime.map((d) => (
            <div
              key={d.date}
              className="flex-1 min-w-[6px] group relative"
              title={`${d.date}: ${d.count} orders`}
            >
              <div
                className="h-full bg-amber-500/30 hover:bg-amber-500/50 rounded-t transition-colors"
                style={{
                  height: `${Math.max(4, (d.count / maxOrders) * 100)}%`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-zinc-500">
          <span>
            {stats.ordersOverTime[0]?.date
              ? new Date(stats.ordersOverTime[0].date).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "short" }
                )
              : ""}
          </span>
          <span>
            {stats.ordersOverTime[stats.ordersOverTime.length - 1]?.date
              ? new Date(
                  stats.ordersOverTime[stats.ordersOverTime.length - 1].date
                ).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : ""}
          </span>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <p className="text-sm text-zinc-500 mt-1">
            New restaurants in the last 30 days: {stats.newRestaurantsLast30}
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.totalRestaurants}
              </p>
              <p className="text-sm text-zinc-500">Restaurants</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.totalUsers}
              </p>
              <p className="text-sm text-zinc-500">Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.totalOrders}
              </p>
              <p className="text-sm text-zinc-500">Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">
                ₹{stats.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-zinc-500">Revenue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
