import { redirect } from "next/navigation";
import { getUserDistrict } from "@/lib/auth";
import { requireDistrictAdmin } from "@/lib/require-role";
import { prisma } from "@/lib/prisma.server";
import DistrictRestrictedState from "@/components/district/DistrictRestrictedState";
import {
  Building2,
  ShoppingBag,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wallet,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

const BG = "#0B0F14";
const BORDER = "#1F2733";
const CARD_BG = "#141A22";
const TEXT_PRIMARY = "#F8FAFC";
const TEXT_MUTED = "#94A3B8";
const ACCENT = "#F59E0B";

/** Fail-closed: subscription must be ACTIVE and district isActive for full access. */
const isSubscriptionHealthy = (district: { isActive: boolean; subscriptionStatus: string }) =>
  district.isActive && district.subscriptionStatus === "ACTIVE";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** IST (Asia/Kolkata) bounds for Shahdol pilot. Prisma stores UTC; we filter by IST "today". */
function getTodayBoundsIST() {
  const now = new Date();
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istTime = now.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istTime);
  const y = istDate.getUTCFullYear();
  const m = istDate.getUTCMonth();
  const d = istDate.getUTCDate();
  const startUTC = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
  return { start: startUTC, end: endUTC };
}

export default async function DistrictDashboardPage() {
  let user;
  try {
    user = await requireDistrictAdmin();
  } catch {
    redirect("/login");
  }

  const district = await getUserDistrict(user.id);

  if (!district) {
    return (
      <div className="p-6" style={{ backgroundColor: BG }}>
        <div
          className="rounded-lg border p-4"
          style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
        >
          <p style={{ color: "#FCA5A5" }}>District not found. Please contact support.</p>
        </div>
      </div>
    );
  }

  if (!isSubscriptionHealthy(district)) {
    return (
      <div className="p-6" style={{ backgroundColor: BG }}>
        <DistrictRestrictedState district={district} />
      </div>
    );
  }

  const { start: todayStart, end: todayEnd } = getTodayBoundsIST();

  const [
    restaurantsCount,
    ordersTodayCount,
    revenueTodayResult,
    restaurantsWithStats,
    revenueSharePendingCount,
    lastRevenueShareForDistrict,
  ] = await Promise.all([
    prisma.restaurant.count({ where: { districtId: district.id } }),
    prisma.order.count({
      where: {
        restaurant: { districtId: district.id },
        createdAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.order.aggregate({
      where: {
        restaurant: { districtId: district.id },
        status: "SERVED",
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      _sum: { total: true },
    }),
    prisma.restaurant.findMany({
      where: { districtId: district.id },
      include: {
        owner: { select: { email: true, name: true } },
        subscription: { select: { status: true } },
        orders: {
          where: {
            status: "SERVED",
            createdAt: { gte: todayStart, lt: todayEnd },
          },
          select: { total: true },
        },
        settlements: {
          where: { date: { gte: todayStart, lt: todayEnd } },
          select: { status: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.revenueShare.count({
      where: { districtId: district.id, payoutStatus: "PENDING" },
    }),
    prisma.revenueShare.findFirst({
      where: { districtId: district.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const totalRevenueToday = revenueTodayResult._sum.total ?? 0;
  const partnersCount = district.partners.length;

  const lastWebhookAt = lastRevenueShareForDistrict?.createdAt ?? null;

  const stats = [
    { label: "Restaurants", value: restaurantsCount, icon: Building2 },
    { label: "Orders Today", value: ordersTodayCount, icon: ShoppingBag },
    { label: "Revenue Today", value: `₹${totalRevenueToday.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, icon: DollarSign },
    { label: "Partners", value: partnersCount, icon: Users },
    { label: "Pending Payouts", value: revenueSharePendingCount, icon: Wallet },
  ];

  const restaurantRows = restaurantsWithStats.map((r) => {
    const todaysSales = r.orders.reduce((sum, o) => sum + o.total, 0);
    const subStatus = r.subscription?.status ?? "TRIAL";
    const settlement = r.settlements[0];
    const payoutStatus = settlement?.status ?? "—";

    return {
      id: r.id,
      name: r.name,
      ownerEmail: r.owner.email,
      status: subStatus,
      todaysSales,
      payoutStatus,
    };
  });

  return (
    <div className="min-h-screen px-4 py-6 md:px-6" style={{ backgroundColor: BG }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: TEXT_PRIMARY }}
          >
            District Operations — {district.name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
            {district.code} · Real-time overview
            {lastWebhookAt && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                Last sync: {formatRelativeTime(lastWebhookAt)}
              </span>
            )}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-lg border p-6"
                style={{
                  backgroundColor: CARD_BG,
                  borderColor: BORDER,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: TEXT_MUTED }}>
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold mt-1" style={{ color: TEXT_PRIMARY }}>
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-lg"
                    style={{ backgroundColor: `${ACCENT}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: ACCENT }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Restaurants Table */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
        >
          <div
            className="px-6 py-4 border-b"
            style={{ borderColor: BORDER }}
          >
            <h2 className="text-lg font-semibold" style={{ color: TEXT_PRIMARY }}>
              Restaurants
            </h2>
            <p className="text-sm mt-0.5" style={{ color: TEXT_MUTED }}>
              Status, today&apos;s sales, and payout status
            </p>
          </div>
          <div className="overflow-auto max-h-[50vh] scrollbar-thin">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: CARD_BG }}>
                <tr style={{ borderColor: BORDER }}>
                  <th
                    className="px-6 py-4 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: TEXT_MUTED, borderColor: BORDER }}
                  >
                    Restaurant
                  </th>
                  <th
                    className="px-6 py-4 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: TEXT_MUTED, borderColor: BORDER }}
                  >
                    Status
                  </th>
                  <th
                    className="px-6 py-4 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: TEXT_MUTED, borderColor: BORDER }}
                  >
                    Today&apos;s Sales
                  </th>
                  <th
                    className="px-6 py-4 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: TEXT_MUTED, borderColor: BORDER }}
                  >
                    Payout Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {restaurantRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-sm"
                      style={{ color: TEXT_MUTED }}
                    >
                      No restaurants in this district
                    </td>
                  </tr>
                ) : (
                  restaurantRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t"
                      style={{ borderColor: BORDER }}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium" style={{ color: TEXT_PRIMARY }}>
                            {row.name}
                          </p>
                          <p className="text-xs" style={{ color: TEXT_MUTED }}>
                            {row.ownerEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-6 py-4 font-mono text-sm" style={{ color: TEXT_PRIMARY }}>
                        ₹{row.todaysSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <PayoutBadge status={row.payoutStatus} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof CheckCircle2; label: string; color: string }> = {
    ACTIVE: { icon: CheckCircle2, label: "Active", color: "#22C55E" },
    TRIAL: { icon: Clock, label: "Trial", color: ACCENT },
    SUSPENDED: { icon: AlertCircle, label: "Suspended", color: "#F87171" },
    CANCELLED: { icon: AlertCircle, label: "Cancelled", color: "#94A3B8" },
    EXPIRED: { icon: AlertCircle, label: "Expired", color: "#94A3B8" },
  };
  const c = config[status] ?? { icon: Clock, label: status, color: TEXT_MUTED };
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${c.color}20`, color: c.color }}
    >
      <Icon className="h-3.5 w-3.5" />
      {c.label}
    </span>
  );
}

function PayoutBadge({ status }: { status: string }) {
  if (status === "—") {
    return <span className="text-sm" style={{ color: TEXT_MUTED }}>—</span>;
  }
  const config: Record<string, { color: string }> = {
    PENDING: { color: ACCENT },
    PROCESSED: { color: "#22C55E" },
    RECONCILED: { color: "#22C55E" },
    DISPUTED: { color: "#F87171" },
  };
  const c = config[status] ?? { color: TEXT_MUTED };
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize"
      style={{ backgroundColor: `${c.color}20`, color: c.color }}
    >
      {status.toLowerCase()}
    </span>
  );
}
