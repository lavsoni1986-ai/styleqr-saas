import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import PlatformSidebar from "@/components/platform/PlatformSidebar";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireSuperAdmin();
  } catch (error) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
