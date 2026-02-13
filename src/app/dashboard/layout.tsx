"use client";

import Sidebar from "@/components/dashboard/Sidebar";
import { CashfreeScript } from "@/components/CashfreeScript";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <CashfreeScript />
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-zinc-950/50 dark-theme-inputs">
        {children}
      </main>
    </div>
  );
}
