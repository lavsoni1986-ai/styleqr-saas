import { redirect } from "next/navigation";
import { requireDistrictAdmin } from "@/lib/require-role";
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DistrictSidebar />
      <main className="flex-1 overflow-y-auto min-h-0">
        {children}
      </main>
    </div>
  );
}
