import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import DistrictManagement from "@/components/platform/DistrictManagement";

export const dynamic = "force-dynamic";

export default async function DistrictsPage() {
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN"]);

  const districts = await prisma.district.findMany({
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          partners: true,
          restaurants: true,
          whiteLabels: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get available users for district admin assignment
  const availableAdmins = await prisma.user.findMany({
    where: {
      role: {
        in: ["SUPER_ADMIN", "DISTRICT_ADMIN"],
      },
      ownedDistrict: null, // Not already assigned to a district
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return (
    <div className="p-6">
      <DistrictManagement districts={districts} availableAdmins={availableAdmins} />
    </div>
  );
}
