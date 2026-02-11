import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import ChurnMonitoringTable from "@/components/platform/ChurnMonitoringTable";

export const dynamic = "force-dynamic";

/**
 * Churn Monitoring Page
 * 
 * SUPER_ADMIN-only global view of churn risk across all districts.
 * 
 * Security:
 * - Requires SUPER_ADMIN authentication
 * - Server-side rendering only
 * - No sensitive data exposure
 */
export default async function ChurnMonitoringPage() {
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN"]);

  // Get all districts with their latest churn signals
  const districts = await prisma.district.findMany({
    where: {
      subscriptionStatus: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      code: true,
      planType: true,
      subscriptionStatus: true,
      churnSignals: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          riskScore: true,
          riskLevel: true,
          reasons: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform data for display
  const districtsWithChurn = districts.map((district) => {
    const latestSignal = district.churnSignals[0];
    return {
      id: district.id,
      name: district.name,
      code: district.code,
      planType: district.planType,
      subscriptionStatus: district.subscriptionStatus,
      riskScore: latestSignal?.riskScore || 0,
      riskLevel: (latestSignal?.riskLevel as "LOW" | "MEDIUM" | "HIGH") || "LOW",
      reasons: (latestSignal?.reasons as string[]) || [],
      lastUpdated: latestSignal?.createdAt || null,
    };
  });

  // Sort by risk score (highest first)
  districtsWithChurn.sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Churn Risk Monitoring</h1>
        <p className="text-slate-600">
          Monitor churn risk across all active districts. High-risk districts may need retention
          intervention.
        </p>
      </div>

      <ChurnMonitoringTable districts={districtsWithChurn} />
    </div>
  );
}

