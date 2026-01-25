import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession, getUserRestaurant } from "@/lib/auth";
import SettlementsContent from "@/components/dashboard/SettlementsContent";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const restaurant = await getUserRestaurant(session.id);
  if (!restaurant) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4">
          <p className="text-red-300">Restaurant not found. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-amber-400 border-t-transparent mb-4"></div>
            <p className="text-zinc-400">Loading settlements...</p>
          </div>
        </div>
      }
    >
      <SettlementsContent restaurantId={restaurant.id} restaurantName={restaurant.name} />
    </Suspense>
  );
}
