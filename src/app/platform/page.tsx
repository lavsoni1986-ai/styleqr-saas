import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma.server";
import PlatformDashboardContent from "@/components/platform/PlatformDashboardContent";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  try {
    await requireSuperAdmin();
  } catch (error) {
    redirect("/login");
  }

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
