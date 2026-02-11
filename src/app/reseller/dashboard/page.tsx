import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma.server";
import { getResellerRevenueSummary, getMonthlyRevenueBreakdown } from "@/lib/revenue-share";
import { getAuthUser } from "@/lib/auth";
import ResellerDashboardContent from "@/components/reseller/ResellerDashboardContent";

export const dynamic = "force-dynamic";

/**
 * Reseller Dashboard Page
 * 
 * Reseller-only dashboard showing revenue, payouts, and districts.
 * 
 * Security:
 * - Requires reseller authentication (via email lookup)
 * - All queries scoped by resellerId
 * - No cross-reseller data access
 */
export default async function ResellerDashboardPage() {
  try {
    // Get authenticated user from session
    const session = await getAuthUser();
    
    if (!session) {
      redirect("/login");
    }

    // Find reseller by email
    const reseller = await prisma.reseller.findUnique({
      where: { email: session.email },
      select: {
        id: true,
        name: true,
        email: true,
        commissionRate: true,
      },
    });

    if (!reseller) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">
              Reseller account not found. Please contact support.
            </p>
          </div>
        </div>
      );
    }

    // Get reseller data with districts
    const resellerData = await prisma.reseller.findUnique({
      where: { id: reseller.id },
      include: {
        districts: {
          select: {
            id: true,
            name: true,
            code: true,
            planType: true,
            subscriptionStatus: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!resellerData) {
      redirect("/login");
    }

    // Get revenue summary
    const revenueSummary = await getResellerRevenueSummary(reseller.id);
    const monthlyBreakdown = await getMonthlyRevenueBreakdown(reseller.id, 6);

    return (
      <div className="p-6 space-y-6">
        <ResellerDashboardContent
          reseller={resellerData}
          revenueSummary={revenueSummary}
          monthlyBreakdown={monthlyBreakdown}
        />
      </div>
    );
  } catch (error) {
    redirect("/login");
  }
}

