"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  UtensilsCrossed,
  LayoutGrid,
} from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  createdAt: Date;
  owner: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  district: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  } | null;
  subscription: {
    status: string;
    endDate: Date | null;
  } | null;
  _count: {
    categories: number;
    tables: number;
    orders: number;
  };
  categories: Array<{
    id: string;
    name: string;
    _count: { items: number };
  }>;
}

interface RestaurantDetailProps {
  restaurant: Restaurant;
}

export default function RestaurantDetail({ restaurant }: RestaurantDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/platform/restaurants"
          className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
          title="Back to Restaurants"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
          <p className="text-zinc-400 mt-1">Restaurant details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-500" />
            Overview
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-zinc-400">Owner</span>
              <div className="text-right">
                <p className="text-white">{restaurant.owner.name || "—"}</p>
                <p className="text-sm text-zinc-500">{restaurant.owner.email}</p>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">District</span>
              <span className="text-white">
                {restaurant.district
                  ? `${restaurant.district.name} (${restaurant.district.code})`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Created</span>
              <span className="text-white">
                {new Date(restaurant.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Subscription</span>
              <span
                className={
                  restaurant.subscription?.status === "ACTIVE"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }
              >
                {restaurant.subscription?.status || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-amber-500" />
            Stats
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-zinc-800/50">
              <p className="text-2xl font-bold text-white">
                {restaurant._count.categories}
              </p>
              <p className="text-xs text-zinc-500">Categories</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-zinc-800/50">
              <p className="text-2xl font-bold text-white">
                {restaurant.categories.reduce(
                  (sum, c) => sum + c._count.items,
                  0
                )}
              </p>
              <p className="text-xs text-zinc-500">Menu Items</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-zinc-800/50">
              <p className="text-2xl font-bold text-white">
                {restaurant._count.tables}
              </p>
              <p className="text-xs text-zinc-500">Tables</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <UtensilsCrossed className="h-5 w-5 text-amber-500" />
          Menu Categories
        </h2>
        {restaurant.categories.length === 0 ? (
          <p className="text-zinc-500">No categories yet</p>
        ) : (
          <div className="space-y-2">
            {restaurant.categories.map((cat) => (
              <div
                key={cat.id}
                className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0"
              >
                <span className="text-white">{cat.name}</span>
                <span className="text-zinc-500 text-sm">
                  {cat._count.items} items
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-zinc-500 text-sm">
        Menu is viewable via the restaurant&apos;s QR code. Owner can manage menu
        at Dashboard → Menu.
      </p>
    </div>
  );
}
