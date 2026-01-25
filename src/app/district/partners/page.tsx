import { redirect } from "next/navigation";
import { requireDistrictAdmin, getUserDistrict } from "@/lib/auth";
import PartnerManagement from "@/components/district/PartnerManagement";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  let user;
  try {
    user = await requireDistrictAdmin();
  } catch (error) {
    redirect("/login");
  }

  const district = await getUserDistrict(user.id);

  if (!district) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">District not found. Please contact support.</p>
        </div>
      </div>
    );
  }

  // Get available users for partner assignment
  const { prisma } = await import("@/lib/prisma.server");
  const availableUsers = await prisma.user.findMany({
    where: {
      role: {
        in: ["RESTAURANT_OWNER", "PARTNER"],
      },
      ownedPartner: null, // Not already assigned to a partner
      districtId: district.id, // Must be in this district
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
      <PartnerManagement
        districtId={district.id}
        partners={district.partners}
        availableUsers={availableUsers}
      />
    </div>
  );
}
