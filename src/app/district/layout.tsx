import { redirect } from "next/navigation";
import { requireDistrictAdmin } from "@/lib/auth";
import DistrictSidebar from "@/components/district/DistrictSidebar";

export const dynamic = "force-dynamic";

export default async function DistrictLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireDistrictAdmin();
  } catch (error) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <DistrictSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
