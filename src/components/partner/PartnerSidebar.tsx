"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  DollarSign,
  Building2,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/partner/dashboard",
  },
  {
    title: "Commissions",
    icon: DollarSign,
    href: "/partner/commissions",
  },
  {
    title: "Restaurants",
    icon: Building2,
    href: "/partner/restaurants",
  },
  {
    title: "Analytics",
    icon: TrendingUp,
    href: "/partner/analytics",
  },
];

export default function PartnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Partner</h1>
        <p className="text-sm text-slate-500 mt-1">Partner Dashboard</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-green-100 text-green-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors",
            isLoggingOut && "opacity-50 cursor-not-allowed"
          )}
        >
          <LogOut className="h-5 w-5" />
          <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </div>
  );
}
