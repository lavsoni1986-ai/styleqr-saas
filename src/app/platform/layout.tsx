import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import PlatformSidebar from "@/components/platform/PlatformSidebar";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN"]);

  return (
    <div className="flex h-screen bg-[#0B0F14]">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto bg-[#0B0F14]">
        {children}
      </main>
    </div>
  );
}
