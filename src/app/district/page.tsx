import { redirect } from "next/navigation";
import { requireDistrictAdmin, getUserDistrict } from "@/lib/auth";
import DistrictDashboardContent from "@/components/district/DistrictDashboardContent";

export const dynamic = "force-dynamic";

export default async function DistrictPage() {
  let user;
  try {
    user = await requireDistrictAdmin();
  } catch (error) {
    redirect("/login");
  }

  const district = await getUserDistrict(user.id);

  if (!district) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">District not found. Please contact support.</p>
        </div>
      </div>
    );
  }

  // Load district stats
  const [
    partnersCount,
    restaurantsCount,
    ordersCount,
    totalRevenue,
  ] = await Promise.all([
    district.partners.length,
    district.restaurants.length,
    // Count orders from district restaurants
    import("@/lib/prisma.server").then(({ prisma }) =>
      prisma.order.count({
        where: {
          restaurantId: {
            in: district.restaurants.map((r) => r.id),
          },
          status: "SERVED",
        },
      })
    ),
    // Calculate revenue from commissions
    import("@/lib/prisma.server").then(({ prisma }) =>
      prisma.commission.aggregate({
        where: {
          partnerId: {
            in: district.partners.map((p) => p.id),
          },
          status: "PAID",
        },
        _sum: {
          amount: true,
        },
      })
    ),
  ]);

  const totalRevenueAmount = totalRevenue?._sum?.amount ?? 0;

  const stats = {
    partners: partnersCount,
    restaurants: restaurantsCount,
    orders: ordersCount,
    revenue: totalRevenueAmount,
  };

  return (
    <div className="p-6 space-y-6">
      <DistrictDashboardContent district={district} stats={stats} />
    </div>
  );
}
