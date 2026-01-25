import nextDynamic from "next/dynamic";
import { requireAuth, getUserRestaurant } from "@/lib/auth";

const ReportsContent = nextDynamic(() => import("@/components/dashboard/ReportsContent"), {
  loading: () => (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
  ssr: true,
});

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireAuth();
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

  return <ReportsContent restaurantId={restaurant.id} restaurantName={restaurant.name} />;
}
