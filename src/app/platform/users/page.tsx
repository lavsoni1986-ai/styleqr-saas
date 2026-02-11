import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import UserManagement from "@/components/platform/UserManagement";

export const dynamic = "force-dynamic";

/**
 * Platform Users Page
 *
 * SUPER_ADMIN-only user management.
 * Lists all users with role, email, and associated entities.
 */
export default async function PlatformUsersPage() {
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN"]);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      restaurant: {
        select: {
          id: true,
          name: true,
        },
      },
      ownedDistrict: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      ownedPartner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-full bg-[#0B0F14] p-6">
      <UserManagement users={users} />
    </div>
  );
}
