import { redirect } from "next/navigation";
import { getUserDistrict } from "@/lib/auth";
import { requireDistrictAdmin } from "@/lib/require-role";
import { getUpsellRecommendations } from "@/lib/upsell-engine";
import { getLatestChurnSignal } from "@/lib/churn-engine";
import DistrictDashboardContent from "@/components/district/DistrictDashboardContent";
import DistrictRestrictedState from "@/components/district/DistrictRestrictedState";
import UpsellBanner from "@/components/UpsellBanner";
import ChurnWarningBanner from "@/components/admin/ChurnWarningBanner";
import { prisma } from "@/lib/prisma.server";

export const dynamic = "force-dynamic";

/** Fail-closed: subscription must be ACTIVE and district isActive for full access. */
const isSubscriptionHealthy = (district: { isActive: boolean; subscriptionStatus: string }) =>
  district.isActive && district.subscriptionStatus === "ACTIVE";

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

  // Fail-closed: restricted state when subscription inactive or webhook unhealthy
  if (!isSubscriptionHealthy(district)) {
    return (
      <div className="p-6">
        <DistrictRestrictedState district={district} />
      </div>
    );
  }

  // RLS-like: all queries explicitly scoped by districtId
  const [
    partnersCount,
    restaurantsCount,
    ordersCount,
    totalRevenue,
  ] = await Promise.all([
    district.partners.length,
    district.restaurants.length,
    // M02: Order isolation via restaurant.districtId
    prisma.order.count({
      where: {
        restaurant: { districtId: district.id },
        status: "SERVED",
      },
    }),
    // M04: Commission isolation via partner.districtId
    prisma.commission.aggregate({
      where: {
        partner: { districtId: district.id },
        status: "PAID",
      },
      _sum: { amount: true },
    }),
  ]);

  const totalRevenueAmount = totalRevenue?._sum?.amount ?? 0;

  const stats = {
    partners: partnersCount,
    restaurants: restaurantsCount,
    orders: ordersCount,
    revenue: totalRevenueAmount,
  };

  // Get upsell recommendations and churn signal
  const [upsellRecommendations, churnSignal] = await Promise.all([
    getUpsellRecommendations(district.id),
    getLatestChurnSignal(district.id),
  ]);

  return (
    <div className="p-6 space-y-6">
      {/* Churn Warning Banner (HIGH risk only) */}
      {churnSignal && churnSignal.riskLevel === "HIGH" && (
        <ChurnWarningBanner
          riskScore={churnSignal.riskScore}
          riskLevel={churnSignal.riskLevel as "HIGH"}
          reasons={(churnSignal.reasons as string[]) || []}
        />
      )}

      {/* Upsell Banner */}
      {upsellRecommendations.length > 0 && (
        <UpsellBanner recommendation={upsellRecommendations[0]} />
      )}

      <DistrictDashboardContent district={district} stats={stats} />
    </div>
  );
}
