import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import PlatformDashboardContent from "@/components/platform/PlatformDashboardContent";

export const dynamic = "force-dynamic";

/**
 * Platform Dashboard Page
 * 
 * SUPER_ADMIN-only platform management page.
 * Only SUPER_ADMIN can access this route.
 * RESTAURANT_ADMIN and other roles are redirected to /unauthorized.
 */
export default async function PlatformPage() {
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN"]);

  // Load platform stats
  const [
    districtsCount,
    partnersCount,
    restaurantsCount,
    ordersCount,
    totalRevenue,
    districts,
  ] = await Promise.all([
    prisma.district.count(),
    prisma.partner.count(),
    prisma.restaurant.count(),
    prisma.order.count({
      where: {
        status: {
          in: ["SERVED"],
        },
      },
    }),
    prisma.commission.aggregate({
      where: {
        status: "PAID",
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.district.findMany({
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            partners: true,
            restaurants: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
  ]);

  const stats = {
    districts: districtsCount,
    partners: partnersCount,
    restaurants: restaurantsCount,
    orders: ordersCount,
    revenue: totalRevenue._sum.amount || 0,
  };

  return (
    <div className="p-6 space-y-6">
      <PlatformDashboardContent stats={stats} recentDistricts={districts} />
    </div>
  );
}
