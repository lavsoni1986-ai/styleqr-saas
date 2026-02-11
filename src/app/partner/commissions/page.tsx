import { redirect } from "next/navigation";
import { getUserPartner } from "@/lib/auth";
import { requirePartner } from "@/lib/require-role";
import { prisma } from "@/lib/prisma.server";
import CommissionReports from "@/components/partner/CommissionReports";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
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

  // Load all commissions
  const commissions = await prisma.commission.findMany({
    where: { partnerId: partner.id },
    include: {
      order: {
        select: {
          id: true,
          total: true,
          createdAt: true,
          status: true,
        },
      },
      restaurant: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <CommissionReports commissions={commissions} partner={partner} />
    </div>
  );
}
