import { requireAuth, getUserRestaurant } from "@/lib/auth";
import OrdersContent from "@/components/dashboard/OrdersContent";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
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

  return <OrdersContent restaurantId={restaurant.id} />;
}
