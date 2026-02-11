import { getUserRestaurant } from "@/lib/auth";
import { requireAuthUser } from "@/lib/require-role";
import ShiftsContent from "@/components/dashboard/ShiftsContent";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
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

  return <ShiftsContent restaurantId={restaurant.id} />;
}
