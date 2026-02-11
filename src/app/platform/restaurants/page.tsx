import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import RestaurantManagement from "@/components/platform/RestaurantManagement";

export const dynamic = "force-dynamic";

/**
 * Platform Restaurants Page
 *
 * SUPER_ADMIN-only restaurant management.
 * Lists all restaurants with owner, district, and status.
 */
export default async function PlatformRestaurantsPage() {
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN"]);

  const restaurants = await prisma.restaurant.findMany({
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
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
        },
      },
      _count: {
        select: {
          categories: true,
          tables: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-full bg-[#0B0F14] p-6">
      <RestaurantManagement restaurants={restaurants} />
    </div>
  );
}
