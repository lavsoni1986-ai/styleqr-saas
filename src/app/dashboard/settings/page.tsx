import { getUserRestaurant } from "@/lib/auth";
import { requireAuthUser } from "@/lib/require-role";
import { Settings } from "lucide-react";
import SettingsContent from "@/components/dashboard/SettingsContent";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAuthUser();
  const restaurant = await getUserRestaurant(user.id);

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center card-glass p-8 max-w-md">
          <h1 className="text-xl font-bold text-zinc-100 mb-2">Restaurant Not Found</h1>
          <p className="text-zinc-400">Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <Settings className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">Settings</h1>
            <p className="text-zinc-400 mt-1">Manage your restaurant settings</p>
          </div>
        </div>
      </div>

      <SettingsContent />
    </div>
  );
}
