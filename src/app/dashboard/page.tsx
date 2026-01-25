import { requireAuth, getUserRestaurant } from "@/lib/auth";
import { prisma } from "@/lib/prisma.server";
import { UtensilsCrossed, ShoppingCart, QrCode, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();
  const restaurant = await getUserRestaurant(user.id);

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center card-glass p-8 max-w-md">
          <h1 className="text-xl font-bold text-zinc-100 mb-2">Restaurant Not Found</h1>
          <p className="text-zinc-400">Please contact support.</p>
        </div>
      </div>
    );
  }

  // Get stats
  const [totalOrders, pendingOrders, totalCategories, totalItems, totalTables] = await Promise.all([
    prisma.order.count({ where: { restaurantId: restaurant.id } }),
    prisma.order.count({ where: { restaurantId: restaurant.id, status: "PENDING" } }),
    prisma.category.count({ where: { restaurantId: restaurant.id } }),
    prisma.menuItem.count({ where: { category: { restaurantId: restaurant.id } } }),
    prisma.table.count({ where: { restaurantId: restaurant.id } }),
  ]);

  const stats = [
    {
      title: "Total Orders",
      value: totalOrders,
      icon: ShoppingCart,
      color: "bg-blue-500",
    },
    {
      title: "Pending Orders",
      value: pendingOrders,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
    {
      title: "Menu Items",
      value: totalItems,
      icon: UtensilsCrossed,
      color: "bg-green-500",
    },
    {
      title: "QR Tables",
      value: totalTables,
      icon: QrCode,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Welcome back, {user.name || user.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="card-glass p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">{stat.title}</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.color} bg-opacity-20 border border-white/5`}>
                <stat.icon className={`h-6 w-6 ${stat.color.replace("bg-", "text-")}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-glass p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Restaurant Information</h2>
        <div className="space-y-2">
          <p className="text-zinc-400">
            <span className="font-medium text-zinc-300">Name:</span> {restaurant.name}
          </p>
          <p className="text-zinc-400">
            <span className="font-medium text-zinc-300">Categories:</span> {totalCategories}
          </p>
          <p className="text-zinc-400">
            <span className="font-medium text-zinc-300">Tables:</span> {totalTables}
          </p>
        </div>
      </div>
    </div>
  );
}
