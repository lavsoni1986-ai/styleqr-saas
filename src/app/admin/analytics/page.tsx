import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { getDistrictIdFromHost } from "@/lib/get-district-from-host";
import {
  getDistrictOverview,
  getMonthlyRevenue,
  getTopRestaurants,
  getSubscriptionSummary,
} from "@/lib/district-analytics";
import { hasFeature } from "@/lib/feature-gate";
import { getUpsellRecommendations } from "@/lib/upsell-engine";
import { prisma } from "@/lib/prisma.server";
import { Role } from "@prisma/client";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import UpsellBanner from "@/components/UpsellBanner";

export const dynamic = "force-dynamic";

/**
 * District Analytics Dashboard Page
 * 
 * Security:
 * - RBAC protected (DISTRICT_ADMIN + SUPER_ADMIN)
 * - Host-based district isolation enforced
 * - SUPER_ADMIN can view any district via ?districtId= param
 * - Server-side rendering only
 * - No client-side filtering logic
 * 
 * Features:
 * - Overview cards (restaurants, orders, revenue)
 * - Monthly revenue chart
 * - Top restaurants table
 * - Subscription status
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // RBAC: Require DISTRICT_ADMIN or SUPER_ADMIN
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN", "DISTRICT_ADMIN"]);

  // Determine district scope
  let districtId: string | null = null;

  if (user.role === Role.SUPER_ADMIN) {
    // SUPER_ADMIN: Can optionally filter by districtId param
    const districtIdParam = (params.districtId as string) || undefined;
    if (districtIdParam) {
      districtId = districtIdParam;
    } else {
      // If no param, use host-based district (if on district domain)
      districtId = await getDistrictIdFromHost();
    }
  } else {
    // DISTRICT_ADMIN: Enforce host-based district isolation
    const hostDistrictId = await getDistrictIdFromHost();
    if (!hostDistrictId) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">
              District not found for current host. Please access this page from your district domain.
            </p>
          </div>
        </div>
      );
    }
    districtId = hostDistrictId;
  }

  if (!districtId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">
            {user.role === Role.SUPER_ADMIN
              ? "Please specify a district ID or access from a district domain."
              : "District not found for current host."}
          </p>
        </div>
      </div>
    );
  }

  // Feature Gate: Check if district has ANALYTICS feature
  const district = await prisma.district.findUnique({
    where: { id: districtId },
    select: {
      id: true,
      planType: true,
      subscriptionStatus: true,
    },
  });

  if (!district) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">District not found.</p>
        </div>
      </div>
    );
  }

  if (!hasFeature(district, "ANALYTICS")) {
    redirect("/upgrade");
  }

  // Fetch all analytics data in parallel
  try {
    const [overview, monthlyRevenue, topRestaurants, subscription, upsellRecommendations] =
      await Promise.all([
        getDistrictOverview(districtId),
        getMonthlyRevenue(districtId),
        getTopRestaurants(districtId, 10),
        getSubscriptionSummary(districtId),
        getUpsellRecommendations(districtId),
      ]);

    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Analytics Dashboard</h1>
          <p className="text-zinc-400">
            {user.role === Role.SUPER_ADMIN
              ? "District analytics and performance metrics"
              : "Your district analytics and performance metrics"}
          </p>
        </div>

        {/* Upsell Banner */}
        {upsellRecommendations.length > 0 && (
          <UpsellBanner recommendation={upsellRecommendations[0]} />
        )}

        <AnalyticsDashboard
          overview={overview}
          monthlyRevenue={monthlyRevenue}
          topRestaurants={topRestaurants}
          subscription={subscription}
        />
      </div>
    );
  } catch (error) {
    // Production-safe error handling
    if (process.env.NODE_ENV === "development") {
      console.error("Error loading analytics:", error);
    }

    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">
            Failed to load analytics data. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}

