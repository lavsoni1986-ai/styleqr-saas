"use client";

interface Overview {
  totalRestaurants: number;
  activeRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  currentMonthRevenue: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface RestaurantStat {
  id: string;
  name: string;
  totalOrders: number;
  revenue: number;
  status: "active" | "inactive";
}

interface SubscriptionSummary {
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
  planType: string | null;
}

interface AnalyticsDashboardProps {
  overview: Overview;
  monthlyRevenue: MonthlyRevenue[];
  topRestaurants: RestaurantStat[];
  subscription: SubscriptionSummary;
}

export default function AnalyticsDashboard({
  overview,
  monthlyRevenue,
  topRestaurants,
  subscription,
}: AnalyticsDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Find max revenue for chart scaling
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card-glass p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total Restaurants</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{overview.totalRestaurants}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/20 border border-white/5">
              <svg
                className="h-6 w-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="card-glass p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">Active Restaurants</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{overview.activeRestaurants}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-500/20 border border-white/5">
              <svg
                className="h-6 w-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="card-glass p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total Orders</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{overview.totalOrders.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/20 border border-white/5">
              <svg
                className="h-6 w-6 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="card-glass p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total Revenue</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{formatCurrency(overview.totalRevenue)}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/20 border border-white/5">
              <svg
                className="h-6 w-6 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="card-glass p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">This Month</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{formatCurrency(overview.currentMonthRevenue)}</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/20 border border-white/5">
              <svg
                className="h-6 w-6 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2 card-glass p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Monthly Revenue</h2>
          <div className="space-y-2">
            {monthlyRevenue.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">No revenue data available</p>
            ) : (
              monthlyRevenue.map((month, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300 font-medium">{month.month}</span>
                    <span className="text-zinc-100 font-semibold">{formatCurrency(month.revenue)}</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(month.revenue / maxRevenue) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subscription Status */}
        <div className="card-glass p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Subscription</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-zinc-400">Status</p>
              <p className="text-lg font-semibold text-zinc-100 mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    subscription.subscriptionStatus === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : subscription.subscriptionStatus === "SUSPENDED"
                      ? "bg-yellow-100 text-yellow-800"
                      : subscription.subscriptionStatus === "CANCELLED"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {subscription.subscriptionStatus}
                </span>
              </p>
            </div>
            {subscription.planType && (
              <div>
                <p className="text-sm text-zinc-400">Plan</p>
                <p className="text-lg font-semibold text-zinc-100 mt-1">{subscription.planType}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-zinc-400">Current Period End</p>
              <p className="text-lg font-semibold text-zinc-100 mt-1">
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Restaurants Table */}
      <div className="card-glass overflow-x-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Top Restaurants</h2>
          {topRestaurants.length === 0 ? (
            <p className="text-zinc-400 text-center py-8">No restaurant data available</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {topRestaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-300">{restaurant.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{restaurant.totalOrders.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300 font-semibold">
                      {formatCurrency(restaurant.revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          restaurant.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {restaurant.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

