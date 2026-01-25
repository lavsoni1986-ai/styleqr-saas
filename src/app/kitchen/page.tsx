import nextDynamic from "next/dynamic";
import { requireRestaurantOwner, getUserRestaurant } from "@/lib/auth";

const KitchenDisplay = nextDynamic(() => import("./KitchenDisplay"), {
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="h-10 w-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
  ssr: true,
});

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const user = await requireRestaurantOwner();
  const restaurant = await getUserRestaurant(user.id);

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-4">Restaurant Not Found</h1>
          <p className="text-slate-400">Please contact support.</p>
        </div>
      </div>
    );
  }

  return <KitchenDisplay restaurantId={restaurant.id} restaurantName={restaurant.name} />;
}
