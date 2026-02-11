"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Building2,
  TrendingUp,
  LogOut,
  ExternalLink,
} from "lucide-react";

const LAV_DIGITAL_URL = "https://lav-digital-site-git-main-lavsoni1986-ais-projects.vercel.app/";
import { cn } from "@/lib/utils";
import { useState } from "react";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/platform",
  },
  {
    title: "Districts",
    icon: MapPin,
    href: "/platform/districts",
  },
  {
    title: "Users",
    icon: Users,
    href: "/platform/users",
  },
  {
    title: "Restaurants",
    icon: Building2,
    href: "/platform/restaurants",
  },
  {
    title: "Analytics",
    icon: TrendingUp,
    href: "/platform/analytics",
  },
];

export default function PlatformSidebar() {
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
    <div className="w-64 bg-[#0B0F14] border-r border-zinc-800 flex flex-col h-full">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white">Platform Admin</h1>
          {process.env.NEXT_PUBLIC_BETA_MODE === "true" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">
              Beta
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-400 mt-1">Super Admin Panel</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/platform" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors border-l-2 border-transparent",
                isActive
                  ? "bg-white/5 text-white font-semibold border-amber-500"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-300"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-amber-500" : "")} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-3">
        <a
          href={LAV_DIGITAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-500 hover:text-amber-500 transition-colors"
        >
          <span>Developed by LavDigital</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-300 transition-colors",
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
