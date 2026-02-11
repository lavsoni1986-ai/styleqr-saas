import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import RevenueControlTable from "@/components/platform/RevenueControlTable";

export const dynamic = "force-dynamic";

/**
 * Revenue Control Page
 * 
 * SUPER_ADMIN-only page for managing reseller revenue and payouts.
 * 
 * Security:
 * - Requires SUPER_ADMIN authentication
 * - Server-side rendering only
 * - No sensitive data exposure
 */
export default async function RevenueControlPage() {
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN"]);

  // Get all resellers with revenue data
  const resellers = await prisma.reseller.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      commissionRate: true,
      cfVendorId: true,
      districts: {
        select: {
          id: true,
        },
      },
      revenueShares: {
        select: {
          id: true,
          commissionCents: true,
          payoutStatus: true,
          cfTransferId: true,
          periodStart: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calculate revenue stats for each reseller (convert cents to dollars for display)
  const toDollars = (cents: number) => cents / 100;
  const resellersWithStats = resellers.map((reseller) => {
    const totalRevenue = reseller.revenueShares.reduce(
      (sum, share) => sum + toDollars(share.commissionCents),
      0
    );
    const commissionOwed = reseller.revenueShares
      .filter((share) => share.payoutStatus === "PENDING")
      .reduce((sum, share) => sum + toDollars(share.commissionCents), 0);
    const commissionPaid = reseller.revenueShares
      .filter((share) => share.payoutStatus === "PAID")
      .reduce((sum, share) => sum + toDollars(share.commissionCents), 0);

    const now = new Date();
    const monthlyTotals: Record<string, number> = {};

    for (const share of reseller.revenueShares) {
      const monthKey = new Date(share.periodStart).toLocaleString("default", {
        year: "numeric",
        month: "short",
      });
      if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = 0;
      monthlyTotals[monthKey] += toDollars(share.commissionCents);
    }

    const pendingShares = reseller.revenueShares.filter(
      (share) => share.payoutStatus === "PENDING"
    );

    return {
      id: reseller.id,
      name: reseller.name,
      email: reseller.email,
      commissionRate: reseller.commissionRate,
      districtCount: reseller.districts.length,
      totalRevenue,
      commissionOwed,
      commissionPaid,
      cfVendorId: reseller.cfVendorId,
      pendingPayouts: pendingShares.map((share) => ({
        id: share.id,
        commission: toDollars(share.commissionCents),
        cfTransferId: share.cfTransferId,
        createdAt: share.createdAt,
      })),
      monthlyTotals: Object.entries(monthlyTotals)
        .map(([month, total]) => ({ month, total }))
        .slice(0, 6)
        .reverse(),
    };
  });

  // Sort by commission owed (highest first)
  resellersWithStats.sort((a, b) => b.commissionOwed - a.commissionOwed);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Revenue Control</h1>
        <p className="text-slate-600">
          Manage reseller revenue, commissions, and payouts across all districts.
        </p>
      </div>

      <RevenueControlTable resellers={resellersWithStats} />
    </div>
  );
}

