import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import { notFound } from "next/navigation";
import RestaurantDetail from "@/components/platform/RestaurantDetail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Platform Restaurant Detail Page
 *
 * SUPER_ADMIN-only. View restaurant details, edit, and access menu.
 */
export default async function PlatformRestaurantDetailPage({
  params,
}: PageProps) {
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN"]);

  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      district: {
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
        },
      },
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
        },
      },
      _count: {
        select: {
          categories: true,
          tables: true,
          orders: true,
        },
      },
      categories: {
        select: {
          id: true,
          name: true,
          _count: { select: { items: true } },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!restaurant) {
    notFound();
  }

  return (
    <div className="min-h-full bg-[#0B0F14] p-6">
      <RestaurantDetail restaurant={restaurant} />
    </div>
  );
}
