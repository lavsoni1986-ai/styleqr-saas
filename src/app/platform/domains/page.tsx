import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import DomainManagement from "@/components/platform/DomainManagement";

export const dynamic = "force-dynamic";

/**
 * Platform Domains Management Page
 * 
 * SUPER_ADMIN only
 * 
 * Features:
 * - List all districts with domain information
 * - Show domain verification status
 * - Add/update custom domains
 * - Verify domain ownership via DNS TXT
 * - Display TXT record instructions
 */
export default async function DomainsPage() {
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN"]);

  // Fetch all districts with domain information
  const districts = await prisma.district.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      customDomain: true,
      isDomainVerified: true,
      verificationCheckedAt: true,
      verificationToken: true,
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Domain Management</h1>
        <p className="text-zinc-400">
          Manage custom domains for districts. Domains must be verified via DNS TXT record.
        </p>
      </div>

      <DomainManagement districts={districts} />
    </div>
  );
}

