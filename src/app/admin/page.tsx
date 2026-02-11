import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { Role } from "@prisma/client";
import Link from "next/link";
import { BarChart3, FileText, Users, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Admin Dashboard Page
 *
 * Production-ready admin page with RBAC guard.
 * Only SUPER_ADMIN, RESTAURANT_ADMIN, and RESTAURANT_OWNER can access.
 * Redirects to /login if not authenticated.
 * Redirects to /403 if authenticated but lacks required role.
 */
export default async function AdminPage() {
  const user = await getAuthUser();
  pageGuard(user, [Role.SUPER_ADMIN, Role.RESTAURANT_ADMIN, Role.RESTAURANT_OWNER]);

  const adminLinks = [
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/audit", label: "Audit Logs", icon: FileText },
    ...(user.role === Role.SUPER_ADMIN
      ? [{ href: "/admin/beta-leads", label: "Beta Leads", icon: Users }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-zinc-400 mt-1">
            Welcome back, {user.name || user.email}
          </p>
        </div>

        <div className="card-glass p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Admin Panel
          </h2>
          <p className="text-zinc-400">
            You are authenticated as: <span className="font-medium text-zinc-300">{user.email}</span>
          </p>
          <p className="text-zinc-400 mt-2">
            Role: <span className="font-medium text-zinc-300">{user.role}</span>
          </p>
          {user.restaurantId && (
            <p className="text-zinc-400 mt-2">
              Restaurant ID: <span className="font-medium text-zinc-300">{user.restaurantId}</span>
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="card-glass p-6 flex items-center justify-between hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Icon className="h-6 w-6 text-amber-400" />
                </div>
                <span className="font-medium text-zinc-100">{label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-zinc-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

