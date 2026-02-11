import { redirect } from "next/navigation";
import { getUserPartner } from "@/lib/auth";
import { requirePartner } from "@/lib/require-role";
import { prisma } from "@/lib/prisma.server";
import PartnerDashboardContent from "@/components/partner/PartnerDashboardContent";

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage() {
  let user;
  try {
    user = await requirePartner();
  } catch (error) {
    redirect("/login");
  }

  const partner = await getUserPartner(user.id);

  if (!partner) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Partner not found. Please contact support.</p>
        </div>
      </div>
    );
  }

  // Load partner stats
  const [
    restaurantsCount,
    totalCommissions,
    paidCommissions,
    pendingCommissions,
    subscriptions,
  ] = await Promise.all([
    partner.restaurants.length,
    prisma.commission.aggregate({
      where: { partnerId: partner.id },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.aggregate({
      where: {
        partnerId: partner.id,
        status: "PAID",
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.aggregate({
      where: {
        partnerId: partner.id,
        status: { in: ["PENDING", "CALCULATED"] },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.subscription.findMany({
      where: { partnerId: partner.id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Get recent commissions
  const recentCommissions = await prisma.commission.findMany({
    where: { partnerId: partner.id },
    include: {
      order: {
        select: {
          id: true,
          total: true,
          createdAt: true,
        },
      },
      restaurant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const stats = {
    restaurants: restaurantsCount,
    totalCommissions: totalCommissions._sum.amount || 0,
    totalCommissionCount: totalCommissions._count || 0,
    paidCommissions: paidCommissions._sum.amount || 0,
    paidCommissionCount: paidCommissions._count || 0,
    pendingCommissions: pendingCommissions._sum.amount || 0,
    pendingCommissionCount: pendingCommissions._count || 0,
    commissionRate: partner.commissionRate,
  };

  return (
    <div className="p-6 space-y-6">
      <PartnerDashboardContent
        partner={partner}
        stats={stats}
        subscriptions={subscriptions}
        recentCommissions={recentCommissions}
      />
    </div>
  );
}
