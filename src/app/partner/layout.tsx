import { redirect } from "next/navigation";
import { requirePartner } from "@/lib/require-role";
import PartnerSidebar from "@/components/partner/PartnerSidebar";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requirePartner();
  } catch (error) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <PartnerSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
