import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { Role } from "@prisma/client";
import Link from "next/link";
import { BetaLeadsTable } from "./BetaLeadsTable";

export const dynamic = "force-dynamic";

/**
 * Beta Leads Admin Page
 * SUPER_ADMIN only. View, approve, reject, convert beta leads.
 */
export default async function BetaLeadsPage() {
  const user = await getAuthUser();
  pageGuard(user, [Role.SUPER_ADMIN]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/admin"
                className="text-zinc-400 hover:text-zinc-300 text-sm transition-colors"
              >
                ← Admin
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">
              Beta Leads
            </h1>
            <p className="text-zinc-400 mt-1">
              Manual onboarding. Approve, reject, or convert to District + Restaurant.
            </p>
          </div>
        </div>

        <BetaLeadsTable />
      </div>
    </div>
  );
}
